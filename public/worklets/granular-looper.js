function parameterValue(parameters, name, frame) {
  const values = parameters[name]
  return values.length === 1 ? values[0] : values[frame]
}

class GranularLooperProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "freezeCv", defaultValue: 0, minValue: 0, maxValue: 1 },
      { name: "triggerCv", defaultValue: 0, minValue: 0, maxValue: 1 },
      { name: "positionCv", defaultValue: 0, minValue: -1, maxValue: 1 },
      { name: "sizeCv", defaultValue: 0, minValue: -1, maxValue: 1 },
      { name: "pitchCv", defaultValue: 0, minValue: -2, maxValue: 2 },
      { name: "blendCv", defaultValue: 0, minValue: -1, maxValue: 1 },
    ].map((parameter) => ({ ...parameter, automationRate: "a-rate" }))
  }

  constructor(options) {
    super()
    const seconds = options.processorOptions?.bufferSeconds ?? 4
    this.bufferLength = Math.ceil(sampleRate * seconds)
    this.left = new Float32Array(this.bufferLength)
    this.right = new Float32Array(this.bufferLength)
    this.writeIndex = 0
    this.recordedSamples = 0
    this.samplesUntilSpawn = 0
    this.grains = []
    this.triggered = false
    this.params = {
      position: 0.65,
      grainSize: 0.15,
      pitch: 0,
      inputGain: 1,
      density: 8,
      texture: 0.5,
      feedback: 0.2,
      mix: 0.5,
      frozen: false,
    }

    this.port.onmessage = ({ data }) => {
      if (data.type === "params") {
        this.params = { ...this.params, ...data.values }
      }
    }
  }

  spawnGrain(positionValue, sizeValue, textureValue) {
    const grainSize = Math.max(0.016, Math.min(1, sizeValue))
    const length = Math.max(1, Math.round(grainSize * sampleRate))
    const maxOffset = this.recordedSamples - length - 1
    if (maxOffset <= 0) return

    const minOffset = Math.min(Math.round(sampleRate * 0.04), maxOffset)
    const offsetRange = maxOffset - minOffset
    const position = Math.max(0, Math.min(1, positionValue))
    const texture = Math.max(0, Math.min(1, textureValue))
    const centerOffset = maxOffset - position * offsetRange
    const jitter = texture * offsetRange * 0.5
    const offset = Math.max(
      minOffset,
      Math.min(maxOffset, centerOffset + (Math.random() * 2 - 1) * jitter),
    )
    this.grains.push({
      position:
        (this.writeIndex - offset + this.bufferLength) % this.bufferLength,
      age: 0,
      length,
    })
    if (this.grains.length > 24) this.grains.shift()
  }

  read(buffer, position) {
    const index = Math.floor(position)
    const next = (index + 1) % this.bufferLength
    const fraction = position - index
    return buffer[index] * (1 - fraction) + buffer[next] * fraction
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]
    if (!output?.length) return true

    const inputLeft = input?.[0]
    const inputRight = input?.[1] ?? inputLeft
    const outputLeft = output[0]
    const outputRight = output[1]
    const { density, feedback, frozen } = this.params
    const inputGain = Math.max(0, Math.min(2, this.params.inputGain))

    for (let frame = 0; frame < outputLeft.length; frame++) {
      const freezeCv = parameterValue(parameters, "freezeCv", frame)
      const triggerCv = parameterValue(parameters, "triggerCv", frame) > 0.5
      const position = Math.max(
        0,
        Math.min(
          1,
          this.params.position +
            parameterValue(parameters, "positionCv", frame),
        ),
      )
      const grainSize = Math.max(
        0.016,
        Math.min(
          1,
          this.params.grainSize +
            parameterValue(parameters, "sizeCv", frame) * 0.25,
        ),
      )
      const texture = Math.max(0, Math.min(1, this.params.texture))
      const playbackRate =
        2 **
        Math.max(
          -2,
          Math.min(
            2,
            this.params.pitch + parameterValue(parameters, "pitchCv", frame),
          ),
        )
      const mix = Math.max(
        0,
        Math.min(
          1,
          this.params.mix + parameterValue(parameters, "blendCv", frame),
        ),
      )
      if (triggerCv && !this.triggered) this.samplesUntilSpawn = 0
      this.triggered = triggerCv

      if (this.samplesUntilSpawn <= 0) {
        this.spawnGrain(position, grainSize, texture)
        this.samplesUntilSpawn = Math.max(1, Math.round(sampleRate / density))
      }

      let grainLeft = 0
      let grainRight = 0
      for (let index = this.grains.length - 1; index >= 0; index--) {
        const grain = this.grains[index]
        if (grain.age >= grain.length) {
          this.grains.splice(index, 1)
          continue
        }
        const phase = grain.age / grain.length
        const window = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase)
        grainLeft += this.read(this.left, grain.position) * window
        grainRight += this.read(this.right, grain.position) * window
        grain.position = (grain.position + playbackRate) % this.bufferLength
        grain.age += 1
      }

      const normalization = Math.max(1, Math.sqrt(this.grains.length))
      grainLeft /= normalization
      grainRight /= normalization

      const inputLeftSample = inputLeft?.[frame] ?? 0
      const inputRightSample = inputRight?.[frame] ?? inputLeftSample
      const dryLeft = inputLeftSample * inputGain
      const dryRight = inputRightSample * inputGain
      outputLeft[frame] = dryLeft * (1 - mix) + grainLeft * mix
      if (outputRight)
        outputRight[frame] = dryRight * (1 - mix) + grainRight * mix

      if (!frozen && freezeCv <= 0.5) {
        this.left[this.writeIndex] = Math.tanh(dryLeft + grainLeft * feedback)
        this.right[this.writeIndex] = Math.tanh(
          dryRight + grainRight * feedback,
        )
        this.writeIndex = (this.writeIndex + 1) % this.bufferLength
        this.recordedSamples = Math.min(
          this.recordedSamples + 1,
          this.bufferLength,
        )
      }
      this.samplesUntilSpawn -= 1
    }
    return true
  }
}

registerProcessor("granular-looper", GranularLooperProcessor)
