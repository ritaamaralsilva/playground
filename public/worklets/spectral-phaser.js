const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const randomBipolar = () => Math.random() * 2 - 1

function snapRateToTempo(rate, bpm) {
  const beatRate = clamp(bpm, 20, 300) / 60
  const divisions = [1 / 8, 1 / 4, 1 / 2, 1, 2, 4, 8, 16]
  let closest = beatRate
  let distance = Number.POSITIVE_INFINITY

  for (const division of divisions) {
    const candidate = beatRate * division
    const nextDistance = Math.abs(Math.log(candidate / rate))
    if (nextDistance < distance) {
      closest = candidate
      distance = nextDistance
    }
  }

  return clamp(closest, 0.03, 20)
}

function nextLfoValue(phase, shape, state) {
  const cycle = Math.floor(phase)
  const position = phase - cycle

  if (state.cycle !== cycle) {
    state.previous = state.target
    state.target = randomBipolar()
    state.cycle = cycle
  }

  switch (shape) {
    case 1:
      return 1 - 4 * Math.abs(position - 0.5)
    case 2:
      return position < 0.5 ? 1 : -1
    case 3: {
      const smoothPosition = position * position * (3 - 2 * position)
      return state.previous + (state.target - state.previous) * smoothPosition
    }
    case 4:
      return state.target
    default:
      return Math.sin(position * Math.PI * 2)
  }
}

function allPassCoefficient(frequency, sampleRate) {
  const tangent = Math.tan(
    (Math.PI * clamp(frequency, 20, sampleRate * 0.45)) / sampleRate,
  )
  return (tangent - 1) / (tangent + 1)
}

function peakingCoefficients(frequency, q, gainDb, sampleRate) {
  const omega =
    (2 * Math.PI * clamp(frequency, 20, sampleRate * 0.45)) / sampleRate
  const cosine = Math.cos(omega)
  const sine = Math.sin(omega)
  const amplitude = 10 ** (clamp(gainDb, 0, 20) / 40)
  const alpha = sine / (2 * clamp(q, 0.5, 8))
  const a0 = 1 + alpha / amplitude

  return {
    b0: (1 + alpha * amplitude) / a0,
    b1: (-2 * cosine) / a0,
    b2: (1 - alpha * amplitude) / a0,
    a1: (-2 * cosine) / a0,
    a2: (1 - alpha / amplitude) / a0,
  }
}

function softClip(sample) {
  const magnitude = Math.abs(sample)
  if (magnitude <= 0.9) return sample
  return Math.sign(sample) * (0.9 + 0.1 * Math.tanh((magnitude - 0.9) / 0.1))
}

function makeBiquadState() {
  return {
    x1: 0,
    x2: 0,
    y1: 0,
    y2: 0,
    coefficients: { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 },
    target: { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 },
  }
}

function processBiquad(input, state, smoothing) {
  const current = state.coefficients
  const target = state.target
  current.b0 += (target.b0 - current.b0) * smoothing
  current.b1 += (target.b1 - current.b1) * smoothing
  current.b2 += (target.b2 - current.b2) * smoothing
  current.a1 += (target.a1 - current.a1) * smoothing
  current.a2 += (target.a2 - current.a2) * smoothing

  const output =
    current.b0 * input +
    current.b1 * state.x1 +
    current.b2 * state.x2 -
    current.a1 * state.y1 -
    current.a2 * state.y2

  state.x2 = state.x1
  state.x1 = input
  state.y2 = state.y1
  state.y1 = Number.isFinite(output) ? output : 0
  return state.y1
}

class SpectralPhaserProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    const continuous = (name, defaultValue, minValue, maxValue) => ({
      name,
      defaultValue,
      minValue,
      maxValue,
      automationRate: "a-rate",
    })

    return [
      continuous("rate", 0.35, 0.03, 8),
      continuous("depth", 0.65, 0, 1),
      continuous("resonance", 0.42, 0, 1),
      continuous("feedback", 0.22, 0, 0.8),
      continuous("mix", 0.58, 0, 1),
      continuous("output", 1, 0, 1.5),
      continuous("low", 0.58, 0, 1),
      continuous("high1", 0.74, 0, 1),
      continuous("high2", 0.7, 0, 1),
      continuous("lowFrequency", 87, 30, 500),
      continuous("high1Frequency", 958, 300, 5000),
      continuous("high2Frequency", 1279, 400, 8000),
      continuous("sweep", 0.55, 0, 1),
      continuous("phase", 0.15, 0, 1),
      continuous("stereoWidth", 0.2, 0, 1),
      continuous("lowRate", 0.45, 0.1, 4),
      continuous("highRate", 1.3, 0.1, 4),
      continuous("bpm", 120, 20, 300),
      continuous("rateCv", 0, -8, 8),
      continuous("depthCv", 0, -1, 1),
      continuous("resonanceCv", 0, -1, 1),
      continuous("feedbackCv", 0, -0.8, 0.8),
      continuous("mixCv", 0, -1, 1),
      continuous("lowCv", 0, -1, 1),
      continuous("high1Cv", 0, -1, 1),
      continuous("high2Cv", 0, -1, 1),
      continuous("sweepCv", 0, -1, 1),
      continuous("lowRateCv", 0, -4, 4),
      continuous("highRateCv", 0, -4, 4),
      {
        name: "shape",
        defaultValue: 0,
        minValue: 0,
        maxValue: 4,
        automationRate: "k-rate",
      },
      {
        name: "sync",
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate",
      },
    ]
  }

  constructor() {
    super()
    this.phase = { low: 0, high: 0, high2: 0, allpass: 0 }
    this.control = {
      rate: 0.35,
      depth: 0.65,
      resonance: 0.42,
      feedback: 0.22,
      mix: 0.58,
      output: 1,
      low: 0.58,
      high1: 0.74,
      high2: 0.7,
      lowFrequency: 87,
      high1Frequency: 958,
      high2Frequency: 1279,
      sweep: 0.55,
      phase: 0.15,
      stereoWidth: 0.2,
      lowRate: 0.45,
      highRate: 1.3,
      bpm: 120,
    }
    this.channels = Array.from({ length: 2 }, () => ({
      allPass: Array.from({ length: 6 }, () => ({
        x1: 0,
        y1: 0,
        coefficient: 0,
        target: 0,
      })),
      bands: [makeBiquadState(), makeBiquadState(), makeBiquadState()],
      lfos: Array.from({ length: 4 }, () => ({
        cycle: Number.NaN,
        previous: 0,
        target: randomBipolar(),
      })),
      feedback: 0,
      dcInput: 0,
      dcOutput: 0,
    }))
    this.coefficientSmoothing = 1 - Math.exp(-1 / (sampleRate * 0.012))
    this.controlSmoothing = 1 - Math.exp(-1 / (sampleRate * 0.02))
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0]
    if (!output || output.length === 0) return true

    const input = inputs[0] || []
    const frameCount = output[0].length
    const values = (name, index) => {
      const parameter = parameters[name]
      return parameter ? parameter[parameter.length === 1 ? 0 : index] : 0
    }
    const smoothed = (name, target) => {
      this.control[name] +=
        (target - this.control[name]) * this.controlSmoothing
      return this.control[name]
    }

    for (let frame = 0; frame < frameCount; frame += 1) {
      const rate = smoothed(
        "rate",
        clamp(values("rate", frame) + values("rateCv", frame), 0.03, 8),
      )
      const depth = smoothed(
        "depth",
        clamp(values("depth", frame) + values("depthCv", frame), 0, 1),
      )
      const resonance = smoothed(
        "resonance",
        clamp(values("resonance", frame) + values("resonanceCv", frame), 0, 1),
      )
      const feedback = smoothed(
        "feedback",
        clamp(values("feedback", frame) + values("feedbackCv", frame), 0, 0.8),
      )
      const mix = smoothed(
        "mix",
        clamp(values("mix", frame) + values("mixCv", frame), 0, 1),
      )
      const outputLevel = smoothed(
        "output",
        clamp(values("output", frame), 0, 1.5),
      )
      const low = smoothed(
        "low",
        clamp(values("low", frame) + values("lowCv", frame), 0, 1),
      )
      const high1 = smoothed(
        "high1",
        clamp(values("high1", frame) + values("high1Cv", frame), 0, 1),
      )
      const high2 = smoothed(
        "high2",
        clamp(values("high2", frame) + values("high2Cv", frame), 0, 1),
      )
      const lowFrequency = smoothed(
        "lowFrequency",
        values("lowFrequency", frame),
      )
      const high1Frequency = smoothed(
        "high1Frequency",
        values("high1Frequency", frame),
      )
      const high2Frequency = smoothed(
        "high2Frequency",
        values("high2Frequency", frame),
      )
      const sweep = smoothed(
        "sweep",
        clamp(values("sweep", frame) + values("sweepCv", frame), 0, 1),
      )
      const phaseOffset = smoothed("phase", values("phase", frame))
      const stereoWidth = smoothed("stereoWidth", values("stereoWidth", frame))
      const lowRate = smoothed(
        "lowRate",
        clamp(values("lowRate", frame) + values("lowRateCv", frame), 0.1, 4),
      )
      const highRate = smoothed(
        "highRate",
        clamp(values("highRate", frame) + values("highRateCv", frame), 0.1, 4),
      )
      const bpm = smoothed("bpm", values("bpm", frame))
      const shape = clamp(Math.round(values("shape", frame)), 0, 4)
      const isSync = values("sync", frame) >= 0.5
      const lfoRate = isSync ? snapRateToTempo(rate, bpm) : rate
      const lowLfoRate = clamp(lfoRate * lowRate, 0.01, 20)
      const highLfoRate = clamp(lfoRate * highRate, 0.01, 20)

      this.phase.low = (this.phase.low + lowLfoRate / sampleRate) % 1
      this.phase.high = (this.phase.high + highLfoRate / sampleRate) % 1
      this.phase.high2 =
        (this.phase.high2 + (highLfoRate * 1.19) / sampleRate) % 1
      this.phase.allpass =
        (this.phase.allpass + (lfoRate * 0.73) / sampleRate) % 1

      const updateCoefficients = frame % 4 === 0
      const dryLevel = Math.cos(mix * Math.PI * 0.5)
      const wetLevel = Math.sin(mix * Math.PI * 0.5)
      const feedbackAmount = clamp(
        feedback * (0.25 + resonance * 0.75),
        0,
        0.78,
      )

      for (
        let channelIndex = 0;
        channelIndex < output.length;
        channelIndex += 1
      ) {
        const channel = this.channels[channelIndex] || this.channels[0]
        const source = input[channelIndex] || input[0]
        const dry = source ? source[frame] || 0 : 0
        const channelOffset = channelIndex === 0 ? -1 : 1
        const stereoPhase = channelOffset * stereoWidth * 0.25
        const lowModulation = nextLfoValue(
          this.phase.low + phaseOffset * 0.5 + stereoPhase,
          shape,
          channel.lfos[0],
        )
        const high1Modulation = nextLfoValue(
          this.phase.high + phaseOffset + stereoPhase,
          shape,
          channel.lfos[1],
        )
        const high2Modulation = nextLfoValue(
          this.phase.high2 - phaseOffset * 0.37 + stereoPhase,
          shape,
          channel.lfos[2],
        )
        const allPassModulation = nextLfoValue(
          this.phase.allpass + phaseOffset * 0.25 + stereoPhase,
          shape,
          channel.lfos[3],
        )
        const modulationDepth = depth * sweep

        if (updateCoefficients) {
          for (let stage = 0; stage < channel.allPass.length; stage += 1) {
            const spread = (stage - 2.5) * 0.13
            const frequency =
              90 *
              2 **
                (stage * 0.88 +
                  allPassModulation * modulationDepth * 1.25 +
                  spread)
            channel.allPass[stage].target = allPassCoefficient(
              frequency,
              sampleRate,
            )
          }

          const lowCenter =
            lowFrequency * 2 ** (lowModulation * modulationDepth * 1.35)
          const high1Center =
            high1Frequency * 2 ** (high1Modulation * modulationDepth * 1.05)
          const high2Center =
            high2Frequency * 2 ** (high2Modulation * modulationDepth * 0.9)
          const q = 0.6 + resonance * 5.4
          const resonanceGain = 5 + resonance * 11

          channel.bands[0].target = peakingCoefficients(
            lowCenter,
            q,
            low * resonanceGain,
            sampleRate,
          )
          channel.bands[1].target = peakingCoefficients(
            high1Center,
            q * 0.88,
            high1 * (resonanceGain + 2),
            sampleRate,
          )
          channel.bands[2].target = peakingCoefficients(
            high2Center,
            q * 0.76,
            high2 * (resonanceGain + 2),
            sampleRate,
          )
        }

        let wet = dry + channel.feedback * feedbackAmount
        wet = processBiquad(wet, channel.bands[0], this.coefficientSmoothing)

        for (let stage = 0; stage < channel.allPass.length; stage += 1) {
          const allPass = channel.allPass[stage]
          allPass.coefficient +=
            (allPass.target - allPass.coefficient) * this.coefficientSmoothing
          const next =
            allPass.coefficient * wet +
            allPass.x1 -
            allPass.coefficient * allPass.y1
          allPass.x1 = wet
          allPass.y1 = Number.isFinite(next) ? next : 0
          wet = allPass.y1

          if (stage === 1) {
            wet = processBiquad(
              wet,
              channel.bands[1],
              this.coefficientSmoothing,
            )
          } else if (stage === 3) {
            wet = processBiquad(
              wet,
              channel.bands[2],
              this.coefficientSmoothing,
            )
          }
        }

        channel.feedback = Math.tanh(wet * 0.55)
        const blended = dry * dryLevel + wet * wetLevel
        const dcBlocked = blended - channel.dcInput + 0.995 * channel.dcOutput
        channel.dcInput = blended
        channel.dcOutput = Number.isFinite(dcBlocked) ? dcBlocked : 0
        output[channelIndex][frame] = softClip(channel.dcOutput * outputLevel)
      }
    }

    return true
  }
}

registerProcessor("spectral-phaser", SpectralPhaserProcessor)
