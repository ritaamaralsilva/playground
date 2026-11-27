"use client"

import { useEffect, useRef, useCallback, useMemo, useState } from "react"
import type {
  PortId,
  PortDef,
  Cable,
  Point,
  NoiseColor,
  ReverbMode,
} from "../engine/types"
import {
  CABLE_COLORS,
  WAVEFORM_COLOR,
  WAVEFORMS,
  SCALE_NAMES,
} from "../engine/constants"
import { formatGainDb, midiToHz } from "../engine/utils"
import { useSequencer } from "../engine/useSequencer"
import {
  createNoiseBuffer,
  createWavefolderCurve,
} from "../engine/audioModuleNodes"
import { ALL_PORT_DEFS } from "../engine/portDefs"
import { Knob } from "../ui/Knob"
import { Port } from "../ui/Port"
import { ClockModule } from "../modules/ClockModule"
import { SequencerModule } from "../modules/SequencerModule"
import { EnvelopeModule } from "../modules/EnvelopeModule"
import { LfoModule } from "../modules/LfoModule"
import { OscillatorModule } from "../modules/OscillatorModule"
import { FilterModule } from "../modules/FilterModule"
import { VcaModule } from "../modules/VcaModule"
import { ReverbModule } from "../modules/ReverbModule"
import { DelayModule } from "../modules/DelayModule"
import { MixerModule } from "../modules/MixerModule"
import { NoiseModule } from "../modules/NoiseModule"
import { RingModModule } from "../modules/RingModModule"
import { SampleHoldModule } from "../modules/SampleHoldModule"
import { WavefolderModule } from "../modules/WavefolderModule"
import { AttenuverterModule } from "../modules/AttenuverterModule"
import { HarmonicOscillatorModule } from "../modules/HarmonicOscillatorModule"
import { ChannelMixerModule } from "../modules/ChannelMixerModule"
import { CloudyModule } from "../modules/CloudyModule"
import {
  DEFAULT_SPECTRAL_PHASER_SETTINGS,
  SpectralPhaserModule,
} from "../modules/SpectralPhaserModule"
import type { SpectralPhaserSettings } from "../modules/SpectralPhaserModule"

const HARMONIC_MIX_HEADROOM = 0.65

function harmonicLevelFor(
  level: number,
  index: number,
  center: number,
  width: number,
  tilt: number,
) {
  const distance = Math.abs(index + 1 - center)
  const sweepWeight =
    distance >= width ? 0 : Math.cos((distance / width) * (Math.PI / 2))
  const tiltWeight = 2 ** (tilt * (((index - 3.5) / 3.5) * 2))
  return Math.max(0, Math.min(1, level * sweepWeight * tiltWeight))
}

function harmonicCenterCvDepthFor(
  level: number,
  index: number,
  center: number,
  width: number,
  tilt: number,
  depth: number,
) {
  const distance = index + 1 - center
  const absoluteDistance = Math.abs(distance)
  if (absoluteDistance >= width) return 0

  const phase = (absoluteDistance / width) * (Math.PI / 2)
  const tiltWeight = 2 ** (tilt * (((index - 3.5) / 3.5) * 2))
  return (
    level *
    tiltWeight *
    Math.sin(phase) *
    (Math.PI / (2 * width)) *
    Math.sign(distance) *
    depth *
    4
  )
}

function harmonicWidthCvDepthFor(
  level: number,
  index: number,
  center: number,
  width: number,
  tilt: number,
  depth: number,
) {
  const distance = Math.abs(index + 1 - center)
  if (distance >= width) return 0

  const phase = (distance / width) * (Math.PI / 2)
  const tiltWeight = 2 ** (tilt * (((index - 3.5) / 3.5) * 2))
  return (
    level *
    tiltWeight *
    Math.sin(phase) *
    ((distance * Math.PI) / (2 * width ** 2)) *
    depth *
    4
  )
}

function harmonicMixGainFor(
  levels: number[],
  center: number,
  width: number,
  tilt: number,
) {
  const summedLevels = levels.reduce(
    (sum, level, index) =>
      sum + harmonicLevelFor(level, index, center, width, tilt),
    0,
  )
  return HARMONIC_MIX_HEADROOM / Math.max(1, summedLevels)
}

export default function RackContainer() {
  // ── Audio nodes ────────────────────────────────────────────────────────────
  const ctx = useRef<AudioContext | null>(null)
  const oscNode = useRef<OscillatorNode | null>(null)
  const lfoNode = useRef<OscillatorNode | null>(null)
  const lfoGain = useRef<GainNode | null>(null)
  const filterNode = useRef<BiquadFilterNode | null>(null)
  const vcaGain = useRef<GainNode | null>(null)
  const masterGain = useRef<GainNode | null>(null)
  const graphMuteGain = useRef<GainNode | null>(null)
  const analyser = useRef<AnalyserNode | null>(null)
  const reverbConv = useRef<ConvolverNode | null>(null)
  const reverbPreDelayNode = useRef<DelayNode | null>(null)
  const reverbWet = useRef<GainNode | null>(null)
  const reverbDry = useRef<GainNode | null>(null)
  const reverbInput = useRef<GainNode | null>(null)
  const reverbOutput = useRef<GainNode | null>(null)
  const delayNode = useRef<DelayNode | null>(null)
  const delayFbGain = useRef<GainNode | null>(null)
  const delayWet = useRef<GainNode | null>(null)
  const delayInput = useRef<GainNode | null>(null)
  const delayDry = useRef<GainNode | null>(null)
  const delayOutput = useRef<GainNode | null>(null)
  const delayNormalBus = useRef<GainNode | null>(null)
  const delayPingPongBus = useRef<GainNode | null>(null)
  const delayNormalMode = useRef<GainNode | null>(null)
  const delayPingPongMode = useRef<GainNode | null>(null)
  const adsrEnvGain = useRef<GainNode | null>(null)
  const seqCvSource = useRef<ConstantSourceNode | null>(null)
  const seqGateSource = useRef<ConstantSourceNode | null>(null)
  const vcaOutBus = useRef<GainNode | null>(null)

  // ── Buchla-inspired module nodes ──────────────────────────────────────────
  const noiseSource = useRef<AudioBufferSourceNode | null>(null)
  const noiseGain = useRef<GainNode | null>(null)
  const ringModulator = useRef<GainNode | null>(null)
  const ringModLevel = useRef<GainNode | null>(null)
  const sampleHoldAnalyser = useRef<AnalyserNode | null>(null)
  const sampleHoldSource = useRef<ConstantSourceNode | null>(null)
  const sampleHoldSink = useRef<GainNode | null>(null)
  const sampleHoldData = useRef(new Float32Array(2048))
  const wavefolder = useRef<WaveShaperNode | null>(null)
  const attenuverterInput = useRef<GainNode | null>(null)
  const attenuverterScale = useRef<GainNode | null>(null)
  const attenuverterOffset = useRef<ConstantSourceNode | null>(null)
  const attenuverterOutput = useRef<GainNode | null>(null)
  const harmonicOscillators = useRef<OscillatorNode[]>([])
  const harmonicWaveOscillators = useRef<OscillatorNode[]>([])
  const harmonicGains = useRef<GainNode[]>([])
  const harmonicLevelCvInputs = useRef<GainNode[]>([])
  const harmonicOutput = useRef<GainNode | null>(null)
  const harmonicVoctInput = useRef<GainNode | null>(null)
  const harmonicLinearFmInput = useRef<GainNode | null>(null)
  const harmonicExponentialFmInput = useRef<GainNode | null>(null)
  const harmonicCenterCvInput = useRef<GainNode | null>(null)
  const harmonicWidthCvInput = useRef<GainNode | null>(null)
  const harmonicVoctDepths = useRef<GainNode[]>([])
  const harmonicLinearFmDepths = useRef<GainNode[]>([])
  const harmonicExponentialFmDepths = useRef<GainNode[]>([])
  const harmonicCenterCvDepths = useRef<GainNode[]>([])
  const harmonicWidthCvDepths = useRef<GainNode[]>([])
  const channelGains = useRef<GainNode[]>([])
  const channelPanners = useRef<StereoPannerNode[]>([])
  const channelMeterNodes = useRef<AnalyserNode[]>([])
  const channelOutput = useRef<GainNode | null>(null)
  const channelOutputSplitter = useRef<ChannelSplitterNode | null>(null)
  const reverbInputMerger = useRef<ChannelMergerNode | null>(null)
  const reverbOutputSplitter = useRef<ChannelSplitterNode | null>(null)
  const delayInputMerger = useRef<ChannelMergerNode | null>(null)
  const delayOutputSplitter = useRef<ChannelSplitterNode | null>(null)
  const granularInputMerger = useRef<ChannelMergerNode | null>(null)
  const granularOutputSplitter = useRef<ChannelSplitterNode | null>(null)
  const spectralPhaserInputMerger = useRef<ChannelMergerNode | null>(null)
  const spectralPhaserOutputSplitter = useRef<ChannelSplitterNode | null>(null)
  const masterInputMerger = useRef<ChannelMergerNode | null>(null)
  const granularLooper = useRef<AudioWorkletNode | null>(null)
  const spectralPhaser = useRef<AudioWorkletNode | null>(null)
  const granularParamsRef = useRef({
    position: 0.65,
    grainSize: 0.15,
    pitch: 0,
    inputGain: 1,
    density: 8,
    texture: 0.5,
    feedback: 0.2,
    mix: 0.5,
    frozen: false,
  })

  // ── Ping pong delay nodes ──────────────────────────────────────────────────
  const ppDelayL = useRef<DelayNode | null>(null)
  const ppDelayR = useRef<DelayNode | null>(null)
  const ppInputSplitter = useRef<ChannelSplitterNode | null>(null)
  const ppFbL = useRef<GainNode | null>(null)
  const ppFbR = useRef<GainNode | null>(null)
  const ppMerger = useRef<ChannelMergerNode | null>(null)
  const ppSplitter = useRef<ChannelSplitterNode | null>(null)
  const ppPanL = useRef<StereoPannerNode | null>(null)
  const ppPanR = useRef<StereoPannerNode | null>(null)
  const ppWet = useRef<GainNode | null>(null)
  const ppDry = useRef<GainNode | null>(null)

  // ── Refs ───────────────────────────────────────────────────────────────────
  const portRefs = useRef<Partial<Record<PortId, HTMLDivElement>>>({})
  const rackRef = useRef<HTMLDivElement>(null)
  const fitContentRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number>(0)
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const adsrTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const graphSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioStarted = useRef(false)
  const [waveCanvas, setWaveCanvas] = useState<HTMLCanvasElement | null>(null)
  const waveRef = useCallback((canvas: HTMLCanvasElement | null) => {
    setWaveCanvas(canvas)
  }, [])

  // ── Patch state ────────────────────────────────────────────────────────────
  const [cables, setCables] = useState<Cable[]>([])
  const cablesRef = useRef<Cable[]>([])
  const [dragging, setDragging] = useState<{
    portId: PortId
    color: string
  } | null>(null)
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 })
  const [colorIdx, setColorIdx] = useState(0)

  // ── Module state ───────────────────────────────────────────────────────────
  const [bpm, setBpm] = useState(120)
  const [clockBeat, setClockBeat] = useState(false)
  const sequencer = useSequencer(undefined, bpm)
  const seqStep = sequencer.activeStep
  const seqNotes = sequencer.sequence.steps.map((step) => step.note)
  const scaleIdx = Math.max(
    0,
    SCALE_NAMES.indexOf(sequencer.sequence.scale),
  )
  const rootIdx = sequencer.sequence.root
  const [lfoRate, setLfoRate] = useState(0) // lfo inicia com freq a 0Hz
  const [lfoDepth, setLfoDepth] = useState(0) // lfo inicia com depth a 0
  const [oscFreq, setOscFreq] = useState(440)
  const [oscWaveIdx, setOscWaveIdx] = useState(1)
  const [attack, setAttack] = useState(1)
  const [decay, setDecay] = useState(1)
  const [sustain, setSustain] = useState(1)
  const [release, setRelease] = useState(1.2)
  const [filterType, setFilterType] = useState<BiquadFilterType>("lowpass")
  const [filterCutoff, setFilterCutoff] = useState(1200)
  const [filterRes, setFilterRes] = useState(0.5)
  const [vcaLevel, setVcaLevel] = useState(0.8)
  const [reverbSize, setReverbSize] = useState(0.5)
  const [reverbMix, setReverbMix] = useState(0.3)
  const [reverbPreDelay, setReverbPreDelay] = useState(0.025)
  const [reverbCharacter, setReverbCharacter] = useState(0.5)
  const [reverbMode, setReverbMode] = useState<ReverbMode>("hall")
  const [reverbReverse, setReverbReverse] = useState(false)
  const [delayTime, setDelayTime] = useState(0.3)
  const [delayFb, setDelayFb] = useState(0.4)
  const [delayMix, setDelayMix] = useState(0.35)
  const [pingPong, setPingPong] = useState(false)
  const [ppDivision, setPpDivision] = useState(4)
  const [masterVol, setMasterVol] = useState(0.6)
  const [noiseColor, setNoiseColor] = useState<NoiseColor>("white")
  const [noiseLevel, setNoiseLevel] = useState(0.7)
  const [ringModLevelValue, setRingModLevelValue] = useState(0.7)
  const [sampleHoldInputGain, setSampleHoldInputGain] = useState(1)
  const [sampleHoldOffset, setSampleHoldOffset] = useState(0)
  const [sampleHoldSlew, setSampleHoldSlew] = useState(0.01)
  const [wavefolderFold, setWavefolderFold] = useState(1.4)
  const [wavefolderBias, setWavefolderBias] = useState(0)
  const [attenuverterAmount, setAttenuverterAmount] = useState(0.5)
  const [attenuverterOffsetValue, setAttenuverterOffsetValue] = useState(0)
  const [harmonicFrequency, setHarmonicFrequency] = useState(110)
  const [harmonicLevels, setHarmonicLevels] = useState([
    0.85, 0.58, 0.42, 0.32, 0.25, 0.2, 0.16, 0.13,
  ])
  const [harmonicCenter, setHarmonicCenter] = useState(4.5)
  const [harmonicWidth, setHarmonicWidth] = useState(4)
  const [harmonicTilt, setHarmonicTilt] = useState(0)
  const [harmonicLinearFmDepth, setHarmonicLinearFmDepth] = useState(0)
  const [harmonicExponentialFmAmount, setHarmonicExponentialFmAmount] =
    useState(0)
  const [harmonicCenterCvDepth, setHarmonicCenterCvDepth] = useState(0)
  const [harmonicWidthCvDepth, setHarmonicWidthCvDepth] = useState(0)
  const [channelLevels, setChannelLevels] = useState([
    0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 0.75,
  ])
  const [channelPans, setChannelPans] = useState<number[]>(() =>
    Array.from({ length: 8 }, () => 0),
  )
  const [channelMeterAnalyzers, setChannelMeterAnalyzers] = useState<
    Array<AnalyserNode | null>
  >(() => Array.from({ length: 8 }, () => null))
  const [outputMeterAnalyser, setOutputMeterAnalyser] =
    useState<AnalyserNode | null>(null)
  const [grainPosition, setGrainPosition] = useState(0.65)
  const [grainSize, setGrainSize] = useState(0.15)
  const [grainPitch, setGrainPitch] = useState(0)
  const [grainInputGain, setGrainInputGain] = useState(1)
  const [grainDensity, setGrainDensity] = useState(8)
  const [grainTexture, setGrainTexture] = useState(0.5)
  const [grainFeedback, setGrainFeedback] = useState(0.2)
  const [grainMix, setGrainMix] = useState(0.5)
  const [granularFrozen, setGranularFrozen] = useState(false)
  const [granularReady, setGranularReady] = useState(false)
  const [spectralPhaserSettings, setSpectralPhaserSettings] =
    useState<SpectralPhaserSettings>(DEFAULT_SPECTRAL_PHASER_SETTINGS)
  const [spectralPhaserReady, setSpectralPhaserReady] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [patchError, setPatchError] = useState<string | null>(null)
  const updateSpectralPhaserSettings = useCallback(
    (patch: Partial<SpectralPhaserSettings>) =>
      setSpectralPhaserSettings((current) => ({ ...current, ...patch })),
    [],
  )

  const noiseColorRef = useRef(noiseColor)
  const noiseLevelRef = useRef(noiseLevel)
  const ringModLevelRef = useRef(ringModLevelValue)
  const sampleHoldInputGainRef = useRef(sampleHoldInputGain)
  const sampleHoldOffsetRef = useRef(sampleHoldOffset)
  const sampleHoldSlewRef = useRef(sampleHoldSlew)
  const attenuverterAmountRef = useRef(attenuverterAmount)
  const attenuverterOffsetRef = useRef(attenuverterOffsetValue)
  // ── ADSR value refs ────────────────────────────────────────────────────────
  const attackRef = useRef(attack)
  const decayRef = useRef(decay)
  const sustainRef = useRef(sustain)
  const releaseRef = useRef(release)
  const vcaLevelRef = useRef(vcaLevel)
  const updateVcaLevel = useCallback((value: number) => {
    vcaLevelRef.current = value
    setVcaLevel(value)
  }, [])

  // ── Button interaction state ───────────────────────────────────────────────
  const [btnHover, setBtnHover] = useState<"clear" | "patch" | null>(null)
  const [btnPress, setBtnPress] = useState<"clear" | "patch" | null>(null)

  // ── Mobile / orientation detection ────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false)
  const [isPortrait, setIsPortrait] = useState(false)
  const [mobileShowFullRack, setMobileShowFullRack] = useState(true)
  const [mobilePatchReady, setMobilePatchReady] = useState(false)
  const [fitSize, setFitSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 1024)
      setIsPortrait(window.innerHeight > window.innerWidth)
    }
    const onOrientationChange = () => window.setTimeout(check, 100)
    check()
    window.addEventListener("resize", check)
    window.addEventListener("orientationchange", onOrientationChange)
    return () => {
      window.removeEventListener("resize", check)
      window.removeEventListener("orientationchange", onOrientationChange)
    }
  }, [])

  useEffect(() => {
    const content = fitContentRef.current
    if (!content) return

    const updateFit = () => {
      const width = content.offsetWidth
      const height = content.offsetHeight
      if (!width || !height) return
      setFitSize({ width, height })
    }

    const observer = new ResizeObserver(updateFit)
    observer.observe(content)
    updateFit()
    return () => {
      observer.disconnect()
    }
  }, [isMobile, isPortrait])

  // ── Derived ────────────────────────────────────────────────────────────────
  const cableMap = useMemo(
    () =>
      cables.reduce<Partial<Record<PortId, PortId>>>((acc, cable) => {
        acc[cable.from] = cable.to
        acc[cable.to] = cable.from
        return acc
      }, {}),
    [cables],
  )
  const linked = useCallback(
    (a: PortId, b: PortId) => cableMap[a] === b || cableMap[b] === a,
    [cableMap],
  )
  const connectedPorts = new Set<PortId>(cables.flatMap((c) => [c.from, c.to]))
  const ppDelayTime = 60 / bpm / ppDivision

  // ── Build impulse response ─────────────────────────────────────────────────
  const buildImpulse = useCallback(
    (
      audioCtx: AudioContext,
      size: number,
      mode: ReverbMode,
      reverse: boolean,
      character: number,
    ) => {
      const rate = audioCtx.sampleRate
      const length = Math.floor(rate * (0.5 + size * 3.5))
      const buffer = audioCtx.createBuffer(2, length, rate)
      const decay = {
        room: 2.8 + size * 2,
        hall: 1.2 + size * 1.5,
        plate: 1.7 + size * 1.5,
        spring: 2.4 + size * 2,
        convolution: 1.5 + size,
      }[mode]
      const roomReflectionCount = 2 + Math.round(character * 5)
      const hallCenter = new Float32Array(length)
      if (mode === "hall") {
        for (let i = 0; i < length; i++) {
          hallCenter[i] = Math.random() * 2 - 1
        }
      }
      const springModes = [1480, 2260, 3170, 4210].map(
        (frequency) => frequency * (0.65 + character * 1.1),
      )
      const filterCutoff =
        mode === "plate"
          ? 1800 + character * 15000
          : 1000 + character * 17000
      const filterCoefficient = 1 - Math.exp((-2 * Math.PI * filterCutoff) / rate)

      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel)
        const channelOffset = channel * 0.003
        let filteredSample = 0
        for (let i = 0; i < length; i++) {
          const progress = i / length
          const envelope = Math.pow(1 - progress, decay)
          const independentNoise = Math.random() * 2 - 1
          let sample =
            mode === "hall"
              ? hallCenter[i] * (1 - character * 0.65) +
                independentNoise * character * 0.65
              : independentNoise
          sample *= envelope

          if (mode === "room") {
            for (let tap = 0; tap < roomReflectionCount; tap++) {
              const reflectionIndex = Math.floor(
                rate *
                  (0.009 +
                    tap * (0.009 + character * 0.01) +
                    channelOffset),
              )
              if (i === reflectionIndex) {
                sample += (0.5 / (tap + 1)) * envelope
              }
            }
          } else if (mode === "spring") {
            const time = i / rate
            const ringing = springModes.reduce(
              (sum, frequency, index) =>
                sum +
                Math.sin(2 * Math.PI * frequency * time) / (index + 1),
              0,
            )
            sample = (sample * 0.28 + ringing * 0.12) * envelope
          } else if (mode === "plate") {
            filteredSample +=
              filterCoefficient * (sample - filteredSample)
            sample = filteredSample + sample * character * 0.12
          } else if (mode === "convolution") {
            filteredSample +=
              filterCoefficient * (sample - filteredSample)
            sample = filteredSample
          }

          data[i] = sample
        }

        if (reverse) {
          for (let i = 0; i < Math.floor(length / 2); i++) {
            const opposite = length - 1 - i
            const sample = data[i]
            data[i] = data[opposite]
            data[opposite] = sample
          }
        }
      }

      return buffer
    },
    [],
  )

  // ── Audio init ─────────────────────────────────────────────────────────────
  const initAudio = useCallback(() => {
    if (audioStarted.current) return
    audioStarted.current = true
    const ac = new AudioContext()
    ctx.current = ac

    const osc = ac.createOscillator()
    osc.type = WAVEFORMS[oscWaveIdx]
    osc.frequency.value = oscFreq
    osc.start()
    oscNode.current = osc

    const lfo = ac.createOscillator()
    lfo.type = "sine"
    lfo.frequency.value = lfoRate
    lfo.start()
    lfoNode.current = lfo
    const lg = ac.createGain()
    lg.gain.value = 0
    lfo.connect(lg)
    lfoGain.current = lg

    const seqCv = ac.createConstantSource()
    seqCv.offset.value = 0
    seqCv.start()
    seqCvSource.current = seqCv
    const seqGate = ac.createConstantSource()
    seqGate.offset.value = 0
    seqGate.start()
    seqGateSource.current = seqGate

    const filt = ac.createBiquadFilter()
    filt.type = filterType
    filt.frequency.value = filterCutoff
    filt.Q.value = filterRes
    filterNode.current = filt

    const vca = ac.createGain()
    vca.gain.value = vcaLevel
    vcaGain.current = vca

    const envG = ac.createGain()
    envG.gain.value = 1
    adsrEnvGain.current = envG
    const vcaBus = ac.createGain()
    vcaOutBus.current = vcaBus

    const noise = ac.createBufferSource()
    noise.buffer = createNoiseBuffer(ac, noiseColor)
    noise.loop = true
    noise.start()
    noiseSource.current = noise
    const noiseLevelNode = ac.createGain()
    noiseLevelNode.gain.value = noiseLevel
    noiseGain.current = noiseLevelNode

    const ring = ac.createGain()
    ring.gain.value = 0
    ringModulator.current = ring
    const ringLevelNode = ac.createGain()
    ringLevelNode.gain.value = ringModLevelValue
    ringModLevel.current = ringLevelNode

    const sampleAnalyser = ac.createAnalyser()
    sampleAnalyser.fftSize = sampleHoldData.current.length
    sampleHoldAnalyser.current = sampleAnalyser
    const heldCv = ac.createConstantSource()
    heldCv.offset.value = 0
    heldCv.start()
    sampleHoldSource.current = heldCv
    const sampleSink = ac.createGain()
    sampleSink.gain.value = 0
    sampleHoldSink.current = sampleSink

    const folder = ac.createWaveShaper()
    folder.curve = createWavefolderCurve(wavefolderFold, wavefolderBias)
    folder.oversample = "4x"
    wavefolder.current = folder

    const attenInput = ac.createGain()
    attenuverterInput.current = attenInput
    const attenScale = ac.createGain()
    attenScale.gain.value = attenuverterAmount
    attenuverterScale.current = attenScale
    const attenOffset = ac.createConstantSource()
    attenOffset.offset.value = attenuverterOffsetValue
    attenOffset.start()
    attenuverterOffset.current = attenOffset
    const attenOutput = ac.createGain()
    attenuverterOutput.current = attenOutput

    const harmonicBus = ac.createGain()
    harmonicBus.gain.value = harmonicMixGainFor(
      harmonicLevels,
      harmonicCenter,
      harmonicWidth,
      harmonicTilt,
    )
    harmonicOutput.current = harmonicBus
    harmonicOscillators.current = []
    harmonicGains.current = []
    for (let partial = 1; partial <= 8; partial++) {
      const partialOscillator = ac.createOscillator()
      partialOscillator.type = "sine"
      partialOscillator.frequency.value = harmonicFrequency * partial
      partialOscillator.start()
      const partialGain = ac.createGain()
      partialGain.gain.value = harmonicLevelFor(
        harmonicLevels[partial - 1],
        partial - 1,
        harmonicCenter,
        harmonicWidth,
        harmonicTilt,
      )
      harmonicOscillators.current.push(partialOscillator)
      harmonicGains.current.push(partialGain)
    }
    harmonicLevelCvInputs.current = harmonicOscillators.current.map(() =>
      ac.createGain(),
    )
    harmonicWaveOscillators.current = (
      ["triangle", "sawtooth", "square"] as OscillatorType[]
    ).map((waveform) => {
      const oscillator = ac.createOscillator()
      oscillator.type = waveform
      oscillator.frequency.value = harmonicFrequency
      oscillator.start()
      return oscillator
    })
    harmonicVoctInput.current = ac.createGain()
    harmonicLinearFmInput.current = ac.createGain()
    harmonicExponentialFmInput.current = ac.createGain()
    harmonicCenterCvInput.current = ac.createGain()
    harmonicWidthCvInput.current = ac.createGain()
    const harmonicOscillatorsForFm = [
      ...harmonicOscillators.current,
      ...harmonicWaveOscillators.current,
    ]
    harmonicVoctDepths.current = harmonicOscillatorsForFm.map(() => {
      const depth = ac.createGain()
      depth.gain.value = 1200
      return depth
    })
    harmonicLinearFmDepths.current = harmonicOscillatorsForFm.map(
      (_, index) => {
        const depth = ac.createGain()
        depth.gain.value =
          harmonicFrequency *
          harmonicLinearFmDepth *
          (index < 8 ? index + 1 : 1)
        return depth
      },
    )
    harmonicExponentialFmDepths.current = harmonicOscillatorsForFm.map(() => {
      const depth = ac.createGain()
      depth.gain.value = harmonicExponentialFmAmount * 1200
      return depth
    })
    harmonicCenterCvDepths.current = harmonicOscillators.current.map(
      (_, index) => {
        const depth = ac.createGain()
        depth.gain.value = harmonicCenterCvDepthFor(
          harmonicLevels[index],
          index,
          harmonicCenter,
          harmonicWidth,
          harmonicTilt,
          harmonicCenterCvDepth,
        )
        return depth
      },
    )
    harmonicWidthCvDepths.current = harmonicOscillators.current.map(
      (_, index) => {
        const depth = ac.createGain()
        depth.gain.value = harmonicWidthCvDepthFor(
          harmonicLevels[index],
          index,
          harmonicCenter,
          harmonicWidth,
          harmonicTilt,
          harmonicWidthCvDepth,
        )
        return depth
      },
    )

    const mixerBus = ac.createGain()
    mixerBus.channelCount = 2
    mixerBus.channelCountMode = "explicit"
    channelOutput.current = mixerBus
    channelOutputSplitter.current = ac.createChannelSplitter(2)
    channelGains.current = channelLevels.map((level) => {
      const channel = ac.createGain()
      channel.gain.value = level
      return channel
    })
    channelPanners.current = channelPans.map((pan) => {
      const panner = ac.createStereoPanner()
      panner.pan.value = pan
      return panner
    })
    channelMeterNodes.current = channelGains.current.map(() => {
      const meter = ac.createAnalyser()
      meter.fftSize = 256
      return meter
    })
    setChannelMeterAnalyzers(channelMeterNodes.current)

    const conv = ac.createConvolver()
    conv.buffer = buildImpulse(
      ac,
      reverbSize,
      reverbMode,
      reverbReverse,
      reverbCharacter,
    )
    reverbConv.current = conv
    const preDelay = ac.createDelay(0.5)
    preDelay.channelCount = 2
    preDelay.channelCountMode = "explicit"
    preDelay.delayTime.value = reverbPreDelay
    reverbPreDelayNode.current = preDelay
    reverbInput.current = ac.createGain()
    reverbInput.current.channelCount = 2
    reverbInput.current.channelCountMode = "explicit"
    reverbOutput.current = ac.createGain()
    reverbOutput.current.channelCount = 2
    reverbOutput.current.channelCountMode = "explicit"
    reverbInputMerger.current = ac.createChannelMerger(2)
    reverbOutputSplitter.current = ac.createChannelSplitter(2)
    const rwet = ac.createGain()
    rwet.channelCount = 2
    rwet.channelCountMode = "explicit"
    rwet.gain.value = reverbMix
    reverbWet.current = rwet
    const rdry = ac.createGain()
    rdry.channelCount = 2
    rdry.channelCountMode = "explicit"
    rdry.gain.value = 1.0
    reverbDry.current = rdry
    conv.connect(rwet)

    const dly = ac.createDelay(4)
    dly.channelCount = 2
    dly.channelCountMode = "explicit"
    dly.delayTime.value = delayTime
    delayNode.current = dly
    delayInput.current = ac.createGain()
    delayInput.current.channelCount = 2
    delayInput.current.channelCountMode = "explicit"
    delayDry.current = ac.createGain()
    delayDry.current.channelCount = 2
    delayDry.current.channelCountMode = "explicit"
    delayOutput.current = ac.createGain()
    delayOutput.current.channelCount = 2
    delayOutput.current.channelCountMode = "explicit"
    delayInputMerger.current = ac.createChannelMerger(2)
    delayOutputSplitter.current = ac.createChannelSplitter(2)
    delayNormalBus.current = ac.createGain()
    delayNormalBus.current.channelCount = 2
    delayNormalBus.current.channelCountMode = "explicit"
    delayPingPongBus.current = ac.createGain()
    delayPingPongBus.current.channelCount = 2
    delayPingPongBus.current.channelCountMode = "explicit"
    delayNormalMode.current = ac.createGain()
    delayNormalMode.current.channelCount = 2
    delayNormalMode.current.channelCountMode = "explicit"
    delayNormalMode.current.gain.value = pingPong ? 0 : 1
    delayPingPongMode.current = ac.createGain()
    delayPingPongMode.current.channelCount = 2
    delayPingPongMode.current.channelCountMode = "explicit"
    delayPingPongMode.current.gain.value = pingPong ? 1 : 0
    const dfb = ac.createGain()
    dfb.channelCount = 2
    dfb.channelCountMode = "explicit"
    dfb.gain.value = delayFb
    delayFbGain.current = dfb
    const dwet = ac.createGain()
    dwet.channelCount = 2
    dwet.channelCountMode = "explicit"
    dwet.gain.value = delayMix
    delayWet.current = dwet
    dly.connect(dfb)
    dfb.connect(dly)
    dly.connect(dwet)

    const initPpTime = 60 / bpm / ppDivision
    const pDlyL = ac.createDelay(4)
    pDlyL.channelCount = 1
    pDlyL.channelCountMode = "explicit"
    pDlyL.delayTime.value = initPpTime
    ppDelayL.current = pDlyL
    const pDlyR = ac.createDelay(4)
    pDlyR.channelCount = 1
    pDlyR.channelCountMode = "explicit"
    pDlyR.delayTime.value = initPpTime * 2
    ppDelayR.current = pDlyR
    const ppSplitterNode = ac.createChannelSplitter(2)
    ppInputSplitter.current = ppSplitterNode
    const pFbL = ac.createGain()
    pFbL.channelCount = 1
    pFbL.channelCountMode = "explicit"
    pFbL.gain.value = delayFb
    ppFbL.current = pFbL
    const pFbR = ac.createGain()
    pFbR.channelCount = 1
    pFbR.channelCountMode = "explicit"
    pFbR.gain.value = delayFb
    ppFbR.current = pFbR
    pDlyL.connect(pFbL)
    pFbL.connect(pDlyR)
    pDlyR.connect(pFbR)
    pFbR.connect(pDlyL)
    const merger = ac.createChannelMerger(2)
    ppMerger.current = merger
    pDlyL.connect(merger, 0, 0)
    pDlyR.connect(merger, 0, 1)
    const panL = ac.createStereoPanner()
    panL.pan.value = -1
    ppPanL.current = panL
    const panR = ac.createStereoPanner()
    panR.pan.value = 1
    ppPanR.current = panR
    const splitter = ac.createChannelSplitter(2)
    ppSplitter.current = splitter
    merger.connect(splitter)
    splitter.connect(panL, 0)
    splitter.connect(panR, 1)
    const pWet = ac.createGain()
    pWet.gain.value = delayMix * 2
    ppWet.current = pWet
    panL.connect(pWet)
    panR.connect(pWet)
    const pDry = ac.createGain()
    pDry.gain.value = 1.0
    ppDry.current = pDry

    const master = ac.createGain()
    master.channelCount = 2
    master.channelCountMode = "explicit"
    master.gain.value = masterVol
    masterGain.current = master
    masterInputMerger.current = ac.createChannelMerger(2)
    granularInputMerger.current = ac.createChannelMerger(2)
    granularOutputSplitter.current = ac.createChannelSplitter(2)
    spectralPhaserInputMerger.current = ac.createChannelMerger(2)
    spectralPhaserOutputSplitter.current = ac.createChannelSplitter(2)
    const an = ac.createAnalyser()
    an.fftSize = 512
    analyser.current = an
    setOutputMeterAnalyser(an)
    const graphMute = ac.createGain()
    graphMute.channelCount = 2
    graphMute.channelCountMode = "explicit"
    graphMute.gain.value = 1
    graphMuteGain.current = graphMute
    master.connect(graphMute)
    graphMute.connect(ac.destination)
    graphMute.connect(an)

    if (!ac.audioWorklet || typeof AudioWorkletNode === "undefined") {
      setAudioError("Cloudy and Spectral Phaser require AudioWorklet support.")
    } else {
      void ac.audioWorklet
        .addModule("/worklets/granular-looper.js")
        .then(() => {
          if (ctx.current !== ac) return
          const node = new AudioWorkletNode(ac, "granular-looper", {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [2],
            channelCount: 2,
            channelCountMode: "explicit",
            processorOptions: { bufferSeconds: 4 },
          })
          node.port.postMessage({
            type: "params",
            values: granularParamsRef.current,
          })
          granularLooper.current = node
          setGranularReady(true)
        })
        .catch((error: unknown) => {
          const detail =
            error instanceof Error ? ` ${error.message}` : " Unknown error."
          console.error("Could not initialize Cloudy.", error)
          setAudioError(`Cloudy unavailable.${detail}`)
        })
      void ac.audioWorklet
        .addModule("/worklets/spectral-phaser.js")
        .then(() => {
          if (ctx.current !== ac) return
          const node = new AudioWorkletNode(ac, "spectral-phaser", {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [2],
            channelCount: 2,
            channelCountMode: "explicit",
          })
          const initialParameters: Record<string, number> = {
            ...spectralPhaserSettings,
            sync: spectralPhaserSettings.sync ? 1 : 0,
            bpm,
          }
          for (const [name, value] of Object.entries(initialParameters)) {
            node.parameters.get(name)?.setValueAtTime(value, ac.currentTime)
          }
          spectralPhaser.current = node
          setSpectralPhaserReady(true)
        })
        .catch((error: unknown) => {
          const detail =
            error instanceof Error ? ` ${error.message}` : " Unknown error."
          console.error("Could not initialize Spectral Phaser.", error)
          setAudioError(`Spectral Phaser unavailable.${detail}`)
        })
    }
  }, [
    buildImpulse,
    bpm,
    channelLevels,
    channelPans,
    delayFb,
    delayMix,
    delayTime,
    filterCutoff,
    filterRes,
    filterType,
    harmonicCenter,
    harmonicCenterCvDepth,
    harmonicExponentialFmAmount,
    harmonicFrequency,
    harmonicLevels,
    harmonicLinearFmDepth,
    harmonicTilt,
    harmonicWidth,
    harmonicWidthCvDepth,
    lfoRate,
    masterVol,
    noiseColor,
    noiseLevel,
    oscFreq,
    oscWaveIdx,
    pingPong,
    ppDivision,
    reverbMix,
    reverbMode,
    reverbPreDelay,
    reverbCharacter,
    reverbReverse,
    reverbSize,
    ringModLevelValue,
    spectralPhaserSettings,
    vcaLevel,
    wavefolderFold,
    wavefolderBias,
    attenuverterAmount,
    attenuverterOffsetValue,
  ])

  // ── Sync audio graph ───────────────────────────────────────────────────────
  const rebuildAudioGraph = useCallback(
    (newCables: Cable[]) => {
      const ac = ctx.current
      if (!ac) return
      const map = newCables.reduce<Partial<Record<PortId, PortId>>>((a, c) => {
        a[c.from] = c.to
        a[c.to] = c.from
        return a
      }, {})
      const lk = (a: PortId, b: PortId) => map[a] === b || map[b] === a

      const osc = oscNode.current
      const lg = lfoGain.current
      const filt = filterNode.current
      const vca = vcaGain.current
      const env = adsrEnvGain.current
      const vcaBus = vcaOutBus.current
      const conv = reverbConv.current
      const revPreDelay = reverbPreDelayNode.current
      const rwet = reverbWet.current
      const rdry = reverbDry.current
      const revInput = reverbInput.current
      const revOutput = reverbOutput.current
      const dly = delayNode.current
      const dwet = delayWet.current
      const dlyInput = delayInput.current
      const dlyDry = delayDry.current
      const dlyOutput = delayOutput.current
      const dlyNormalBus = delayNormalBus.current
      const dlyPingPongBus = delayPingPongBus.current
      const master = masterGain.current
      const graphMute = graphMuteGain.current
      const nodes: Array<AudioNode | null> = [
        osc,
        lfoGain.current,
        seqCvSource.current,
        seqGateSource.current,
        filt,
        vca,
        env,
        vcaBus,
        conv,
        reverbPreDelayNode.current,
        rwet,
        rdry,
        revInput,
        revOutput,
        dly,
        delayFbGain.current,
        dwet,
        dlyInput,
        dlyDry,
        dlyOutput,
        dlyNormalBus,
        dlyPingPongBus,
        delayNormalMode.current,
        delayPingPongMode.current,
        ppDelayL.current,
        ppDelayR.current,
        ppInputSplitter.current,
        ppFbL.current,
        ppFbR.current,
        ppMerger.current,
        ppSplitter.current,
        ppPanL.current,
        ppPanR.current,
        ppWet.current,
        ppDry.current,
        noiseSource.current,
        noiseGain.current,
        ringModulator.current,
        ringModLevel.current,
        sampleHoldAnalyser.current,
        sampleHoldSource.current,
        sampleHoldSink.current,
        wavefolder.current,
        attenuverterInput.current,
        attenuverterScale.current,
        attenuverterOffset.current,
        attenuverterOutput.current,
        harmonicOutput.current,
        harmonicVoctInput.current,
        harmonicLinearFmInput.current,
        harmonicExponentialFmInput.current,
        harmonicCenterCvInput.current,
        harmonicWidthCvInput.current,
        ...harmonicOscillators.current,
        ...harmonicWaveOscillators.current,
        ...harmonicGains.current,
        ...harmonicLevelCvInputs.current,
        ...harmonicVoctDepths.current,
        ...harmonicLinearFmDepths.current,
        ...harmonicExponentialFmDepths.current,
        ...harmonicCenterCvDepths.current,
        ...harmonicWidthCvDepths.current,
        channelOutput.current,
        channelOutputSplitter.current,
        reverbInputMerger.current,
        reverbOutputSplitter.current,
        delayInputMerger.current,
        delayOutputSplitter.current,
        granularInputMerger.current,
        granularOutputSplitter.current,
        spectralPhaserInputMerger.current,
        spectralPhaserOutputSplitter.current,
        masterInputMerger.current,
        ...channelGains.current,
        ...channelPanners.current,
        ...channelMeterNodes.current,
        granularLooper.current,
        spectralPhaser.current,
      ]
      nodes.forEach((node) => node?.disconnect())

      const noise = noiseGain.current
      const ring = ringModulator.current
      const sampleAnalyser = sampleHoldAnalyser.current
      const sampleSource = sampleHoldSource.current
      const sampleSink = sampleHoldSink.current
      const folder = wavefolder.current
      const attenInput = attenuverterInput.current
      const attenScale = attenuverterScale.current
      const attenOffset = attenuverterOffset.current
      const attenOutput = attenuverterOutput.current
      const harmonicBus = harmonicOutput.current
      const harmonicVoct = harmonicVoctInput.current
      const harmonicLinearFm = harmonicLinearFmInput.current
      const harmonicExponentialFm = harmonicExponentialFmInput.current
      const harmonicCenterCv = harmonicCenterCvInput.current
      const harmonicWidthCv = harmonicWidthCvInput.current
      const harmonicSources = [
        ...harmonicOscillators.current,
        ...harmonicWaveOscillators.current,
      ]
      const mixerBus = channelOutput.current
      const mixerSplitter = channelOutputSplitter.current
      const revInputMerge = reverbInputMerger.current
      const revOutputSplit = reverbOutputSplitter.current
      const dlyInputMerge = delayInputMerger.current
      const dlyOutputSplit = delayOutputSplitter.current
      const granularInputMerge = granularInputMerger.current
      const granularOutputSplit = granularOutputSplitter.current
      const phaserInputMerge = spectralPhaserInputMerger.current
      const phaserOutputSplit = spectralPhaserOutputSplitter.current
      const outputInputMerge = masterInputMerger.current
      const granular = granularLooper.current
      const phaser = spectralPhaser.current
      const dlyNormal = delayNormalMode.current
      const dlyPingPong = delayPingPongMode.current
      const pDlyL = ppDelayL.current
      const pDlyR = ppDelayR.current
      const ppInput = ppInputSplitter.current
      const pFbL = ppFbL.current
      const pFbR = ppFbR.current
      const merger = ppMerger.current
      const splitter = ppSplitter.current
      const panL = ppPanL.current
      const panR = ppPanR.current
      const pWet = ppWet.current
      const pDry = ppDry.current
      const dlyFeedback = delayFbGain.current
      if (
        !osc ||
        !lg ||
        !filt ||
        !vca ||
        !env ||
        !vcaBus ||
        !conv ||
        !revPreDelay ||
        !rwet ||
        !rdry ||
        !revInput ||
        !revOutput ||
        !dly ||
        !dwet ||
        !dlyInput ||
        !dlyDry ||
        !dlyOutput ||
        !dlyNormalBus ||
        !dlyPingPongBus ||
        !dlyNormal ||
        !dlyPingPong ||
        !dlyFeedback ||
        !master ||
        !noise ||
        !ring ||
        !sampleAnalyser ||
        !sampleSource ||
        !sampleSink ||
        !folder ||
        !attenInput ||
        !attenScale ||
        !attenOffset ||
        !attenOutput ||
        !harmonicBus ||
        !harmonicVoct ||
        !harmonicLinearFm ||
        !harmonicExponentialFm ||
        !harmonicCenterCv ||
        !harmonicWidthCv ||
        !mixerBus ||
        !mixerSplitter ||
        !revInputMerge ||
        !revOutputSplit ||
        !dlyInputMerge ||
        !dlyOutputSplit ||
        !granularInputMerge ||
        !granularOutputSplit ||
        !phaserInputMerge ||
        !phaserOutputSplit ||
        !outputInputMerge ||
        !pDlyL ||
        !pDlyR ||
        !ppInput ||
        !pFbL ||
        !pFbR ||
        !merger ||
        !splitter ||
        !panL ||
        !panR ||
        !pWet ||
        !pDry ||
        !ringModLevel.current ||
        !graphMute
      )
        return

      lfoNode.current?.connect(lg)
      noiseSource.current?.connect(noise)
      ring.connect(ringModLevel.current)
      harmonicOscillators.current.forEach((oscillator, index) => {
        oscillator.connect(harmonicGains.current[index])
        harmonicGains.current[index].connect(harmonicBus)
        harmonicLevelCvInputs.current[index].connect(
          harmonicGains.current[index].gain,
        )
        harmonicCenterCv.connect(harmonicCenterCvDepths.current[index])
        harmonicCenterCvDepths.current[index].connect(
          harmonicGains.current[index].gain,
        )
        harmonicWidthCv.connect(harmonicWidthCvDepths.current[index])
        harmonicWidthCvDepths.current[index].connect(
          harmonicGains.current[index].gain,
        )
      })
      harmonicSources.forEach((oscillator, index) => {
        harmonicVoct.connect(harmonicVoctDepths.current[index])
        harmonicVoctDepths.current[index].connect(oscillator.detune)
        harmonicLinearFm.connect(harmonicLinearFmDepths.current[index])
        harmonicLinearFmDepths.current[index].connect(oscillator.frequency)
        harmonicExponentialFm.connect(
          harmonicExponentialFmDepths.current[index],
        )
        harmonicExponentialFmDepths.current[index].connect(oscillator.detune)
      })
      vca.connect(env)
      env.connect(vcaBus)
      if (lk("adsr-env-out", "vca-cv-in")) {
        env.gain.setValueAtTime(0, ac.currentTime)
      } else {
        env.gain.setValueAtTime(1, ac.currentTime)
      }

      attenInput.connect(attenScale)
      attenScale.connect(attenOutput)
      attenOffset.connect(attenOutput)
      channelGains.current.forEach((channel, index) => {
        const meter = channelMeterNodes.current[index]
        const panner = channelPanners.current[index]
        if (!meter || !panner)
          throw new Error(`Channel ${index + 1} stereo mixer nodes are missing.`)
        channel.connect(meter)
        channel.connect(panner)
        panner.connect(mixerBus)
      })
      mixerBus.connect(mixerSplitter)

      revInputMerge.connect(revInput)
      revOutput.connect(revOutputSplit)
      revInput.connect(revPreDelay)
      revPreDelay.connect(conv)
      revInput.connect(rdry)
      conv.connect(rwet)
      rwet.connect(revOutput)
      rdry.connect(revOutput)

      dlyInputMerge.connect(dlyInput)
      dlyOutput.connect(dlyOutputSplit)
      dlyInput.connect(dly)
      dlyInput.connect(dlyDry)
      dly.connect(dlyFeedback)
      dlyFeedback.connect(dly)
      dly.connect(dwet)
      dlyDry.connect(dlyNormalBus)
      dwet.connect(dlyNormalBus)
      dlyNormalBus.connect(dlyNormal)
      dlyNormal.connect(dlyOutput)

      dlyInput.connect(ppInput)
      ppInput.connect(pDlyL, 0)
      ppInput.connect(pDlyR, 1)
      dlyInput.connect(pDry)
      pDlyL.connect(pFbL)
      pFbL.connect(pDlyR)
      pDlyR.connect(pFbR)
      pFbR.connect(pDlyL)
      pDlyL.connect(merger, 0, 0)
      pDlyR.connect(merger, 0, 1)
      merger.connect(splitter)
      splitter.connect(panL, 0)
      splitter.connect(panR, 1)
      panL.connect(pWet)
      panR.connect(pWet)
      pWet.connect(dlyPingPongBus)
      pDry.connect(dlyPingPongBus)
      dlyPingPongBus.connect(dlyPingPong)
      dlyPingPong.connect(dlyOutput)
      outputInputMerge.connect(master)
      if (granular) {
        granularInputMerge.connect(granular)
        granular.connect(granularOutputSplit)
      }
      if (phaser) {
        phaserInputMerge.connect(phaser)
        phaser.connect(phaserOutputSplit)
      }
      dlyNormal.gain.setValueAtTime(pingPong ? 0 : 1, ac.currentTime)
      dlyPingPong.gain.setValueAtTime(pingPong ? 1 : 0, ac.currentTime)

      sampleAnalyser.connect(sampleSink)
      sampleSink.connect(graphMute)
      const lfoIsPatched = newCables.some(
        (cable) => cable.from === "lfo-out" || cable.to === "lfo-out",
      )
      lg.gain.setTargetAtTime(lfoIsPatched ? lfoDepth : 0, ac.currentTime, 0.05)

      const outputNodes: Partial<Record<PortId, AudioNode | null>> = {
        "osc-out": osc,
        "lfo-out": lg,
        "seq-cv-out": seqCvSource.current,
        "seq-gate-out": seqGateSource.current,
        "filter-audio-out": filt,
        "vca-out": vcaBus,
        "reverb-audio-out-l": revOutputSplit,
        "reverb-audio-out-r": revOutputSplit,
        "delay-audio-out-l": dlyOutputSplit,
        "delay-audio-out-r": dlyOutputSplit,
        "noise-out": noise,
        "ring-audio-out": ringModLevel.current,
        "sample-cv-out": sampleSource,
        "wavefolder-audio-out": folder,
        "attenuverter-cv-out": attenOutput,
        "harmonic-out": harmonicBus,
        "harmonic-1-out": harmonicOscillators.current[0],
        "harmonic-2-out": harmonicOscillators.current[1],
        "harmonic-3-out": harmonicOscillators.current[2],
        "harmonic-4-out": harmonicOscillators.current[3],
        "harmonic-5-out": harmonicOscillators.current[4],
        "harmonic-6-out": harmonicOscillators.current[5],
        "harmonic-7-out": harmonicOscillators.current[6],
        "harmonic-8-out": harmonicOscillators.current[7],
        "harmonic-triangle-out": harmonicWaveOscillators.current[0],
        "harmonic-saw-out": harmonicWaveOscillators.current[1],
        "harmonic-square-out": harmonicWaveOscillators.current[2],
        "channel-mixer-out-l": mixerSplitter,
        "channel-mixer-out-r": mixerSplitter,
        "granular-audio-out-l": granularOutputSplit,
        "granular-audio-out-r": granularOutputSplit,
        "spectral-phaser-audio-out-l": phaserOutputSplit,
        "spectral-phaser-audio-out-r": phaserOutputSplit,
      }
      const inputNodes: Partial<Record<PortId, AudioNode | null>> = {
        "filter-audio-in": filt,
        "vca-audio-in": vca,
        "reverb-audio-in-l": revInputMerge,
        "reverb-audio-in-r": revInputMerge,
        "delay-audio-in-l": dlyInputMerge,
        "delay-audio-in-r": dlyInputMerge,
        "ring-audio-a-in": ring,
        "sample-cv-in": sampleAnalyser,
        "wavefolder-audio-in": folder,
        "attenuverter-cv-in": attenInput,
        "channel-1-in": channelGains.current[0],
        "channel-2-in": channelGains.current[1],
        "channel-3-in": channelGains.current[2],
        "channel-4-in": channelGains.current[3],
        "channel-5-in": channelGains.current[4],
        "channel-6-in": channelGains.current[5],
        "channel-7-in": channelGains.current[6],
        "channel-8-in": channelGains.current[7],
        "spectral-phaser-audio-in-l": phaserInputMerge,
        "spectral-phaser-audio-in-r": phaserInputMerge,
        "harmonic-v-oct-in": harmonicVoct,
        "harmonic-lin-fm-in": harmonicLinearFm,
        "harmonic-exp-fm-in": harmonicExponentialFm,
        "harmonic-center-cv-in": harmonicCenterCv,
        "harmonic-width-cv-in": harmonicWidthCv,
        "harmonic-1-level-cv-in": harmonicLevelCvInputs.current[0],
        "harmonic-2-level-cv-in": harmonicLevelCvInputs.current[1],
        "harmonic-3-level-cv-in": harmonicLevelCvInputs.current[2],
        "harmonic-4-level-cv-in": harmonicLevelCvInputs.current[3],
        "harmonic-5-level-cv-in": harmonicLevelCvInputs.current[4],
        "harmonic-6-level-cv-in": harmonicLevelCvInputs.current[5],
        "harmonic-7-level-cv-in": harmonicLevelCvInputs.current[6],
        "harmonic-8-level-cv-in": harmonicLevelCvInputs.current[7],
        "granular-audio-in-l": granularInputMerge,
        "granular-audio-in-r": granularInputMerge,
        "out-in-l": outputInputMerge,
        "out-in-r": outputInputMerge,
      }
      const outputChannelIndices: Partial<Record<PortId, number>> = {
        "reverb-audio-out-l": 0,
        "reverb-audio-out-r": 1,
        "delay-audio-out-l": 0,
        "delay-audio-out-r": 1,
        "channel-mixer-out-l": 0,
        "channel-mixer-out-r": 1,
        "granular-audio-out-l": 0,
        "granular-audio-out-r": 1,
        "spectral-phaser-audio-out-l": 0,
        "spectral-phaser-audio-out-r": 1,
      }
      const inputChannelIndices: Partial<Record<PortId, number>> = {
        "reverb-audio-in-l": 0,
        "reverb-audio-in-r": 1,
        "delay-audio-in-l": 0,
        "delay-audio-in-r": 1,
        "granular-audio-in-l": 0,
        "granular-audio-in-r": 1,
        "spectral-phaser-audio-in-l": 0,
        "spectral-phaser-audio-in-r": 1,
        "out-in-l": 0,
        "out-in-r": 1,
      }
      const inputParams: Partial<Record<PortId, AudioParam | null>> = {
        "osc-fm-in": osc.frequency,
        "filter-cv-in": filt.frequency,
        "ring-audio-b-in": ring.gain,
        "granular-freeze-cv-in":
          granularLooper.current?.parameters.get("freezeCv") ?? null,
        "granular-trigger-cv-in":
          granularLooper.current?.parameters.get("triggerCv") ?? null,
        "granular-position-cv-in":
          granularLooper.current?.parameters.get("positionCv") ?? null,
        "granular-size-cv-in":
          granularLooper.current?.parameters.get("sizeCv") ?? null,
        "granular-pitch-cv-in":
          granularLooper.current?.parameters.get("pitchCv") ?? null,
        "granular-blend-cv-in":
          granularLooper.current?.parameters.get("blendCv") ?? null,
        "spectral-phaser-rate-cv-in":
          spectralPhaser.current?.parameters.get("rateCv") ?? null,
        "spectral-phaser-depth-cv-in":
          spectralPhaser.current?.parameters.get("depthCv") ?? null,
        "spectral-phaser-resonance-cv-in":
          spectralPhaser.current?.parameters.get("resonanceCv") ?? null,
        "spectral-phaser-feedback-cv-in":
          spectralPhaser.current?.parameters.get("feedbackCv") ?? null,
        "spectral-phaser-mix-cv-in":
          spectralPhaser.current?.parameters.get("mixCv") ?? null,
        "spectral-phaser-low-cv-in":
          spectralPhaser.current?.parameters.get("lowCv") ?? null,
        "spectral-phaser-high1-cv-in":
          spectralPhaser.current?.parameters.get("high1Cv") ?? null,
        "spectral-phaser-high2-cv-in":
          spectralPhaser.current?.parameters.get("high2Cv") ?? null,
        "spectral-phaser-sweep-cv-in":
          spectralPhaser.current?.parameters.get("sweepCv") ?? null,
        "spectral-phaser-low-rate-cv-in":
          spectralPhaser.current?.parameters.get("lowRateCv") ?? null,
        "spectral-phaser-high-rate-cv-in":
          spectralPhaser.current?.parameters.get("highRateCv") ?? null,
      }
      for (const cable of newCables) {
        const source = outputNodes[cable.from]
        const destination = inputNodes[cable.to]
        const parameter = inputParams[cable.to]
        if (source && destination)
          source.connect(
            destination,
            outputChannelIndices[cable.from] ?? 0,
            inputChannelIndices[cable.to] ?? 0,
          )
        else if (source && parameter)
          source.connect(parameter, outputChannelIndices[cable.from] ?? 0)
      }
    },
    [lfoDepth, pingPong],
  )

  const syncGraph = useCallback(
    (newCables: Cable[]) => {
      const ac = ctx.current
      const graphMute = graphMuteGain.current
      if (!ac || !graphMute) return

      const now = ac.currentTime
      if (graphMute.gain.cancelAndHoldAtTime) {
        graphMute.gain.cancelAndHoldAtTime(now)
      } else {
        graphMute.gain.cancelScheduledValues(now)
        graphMute.gain.setValueAtTime(graphMute.gain.value, now)
      }
      graphMute.gain.linearRampToValueAtTime(0, now + 0.005)

      if (graphSyncTimer.current) clearTimeout(graphSyncTimer.current)
      graphSyncTimer.current = setTimeout(() => {
        graphSyncTimer.current = null
        try {
          rebuildAudioGraph(newCables)
          setPatchError(null)
        } catch (error) {
          if (
            error instanceof DOMException &&
            error.name === "InvalidAccessError"
          ) {
            console.error(
              "The patch contains an unsupported audio feedback loop.",
              error,
            )
            setPatchError(
              "That patch creates an audio feedback loop without a delay.",
            )
          } else {
            throw error
          }
        } finally {
          const currentContext = ctx.current
          const currentMute = graphMuteGain.current
          if (currentContext && currentMute) {
            const rebuildTime = currentContext.currentTime
            currentMute.gain.cancelScheduledValues(rebuildTime)
            currentMute.gain.setValueAtTime(0, rebuildTime)
            currentMute.gain.linearRampToValueAtTime(1, rebuildTime + 0.005)
          }
        }
      }, 10)
    },
    [rebuildAudioGraph],
  )

  // ── ADSR trigger ───────────────────────────────────────────────────────────
  const triggerADSR = useCallback(() => {
    const ac = ctx.current
    const env = adsrEnvGain.current
    if (!ac || !env) return
    if (!linked("adsr-env-out", "vca-cv-in")) return
    const attack = attackRef.current
    const decay = decayRef.current
    const sustain = sustainRef.current
    const release = releaseRef.current
    adsrTimers.current.forEach(clearTimeout)
    adsrTimers.current = []
    const now = ac.currentTime
    // Cancel any ongoing envelope to prevent clicks, then start new one , using cancelHoldAtTime to allow for quick re-triggers without needing to return to zero first
    if (env.gain.cancelAndHoldAtTime) {
      env.gain.cancelAndHoldAtTime(now)
    } else {
      env.gain.cancelScheduledValues(now)
    }
    // Short 5ms ramp to zero before attack — eliminates click from any
    // residual gain value when a new note retriggers mid-envelope
    const preAttack = 0.005
    env.gain.linearRampToValueAtTime(0, now + preAttack)
    env.gain.linearRampToValueAtTime(1, now + preAttack + attack)
    env.gain.setValueAtTime(sustain, now + preAttack + attack + decay)
    env.gain.linearRampToValueAtTime(sustain, now + preAttack + attack + decay)
    // Short 5ms ramp at release end instead of hard snap to zero
    env.gain.linearRampToValueAtTime(
      0,
      now + preAttack + attack + decay + 0.05 + release,
    )
  }, [linked])

  const sampleAndHold = useCallback(() => {
    const ac = ctx.current
    const input = sampleHoldAnalyser.current
    const output = sampleHoldSource.current
    if (!ac || !input || !output) return

    input.getFloatTimeDomainData(sampleHoldData.current)
    const sample =
      sampleHoldData.current[sampleHoldData.current.length - 1] *
        sampleHoldInputGainRef.current +
      sampleHoldOffsetRef.current
    output.offset.setTargetAtTime(
      sample,
      ac.currentTime,
      Math.max(0.001, sampleHoldSlewRef.current),
    )
  }, [])

  // ── Sequencer ──────────────────────────────────────────────────────────────
  const sequencerClockTick = sequencer.clockTick
  const stepSeq = useCallback(() => {
    sequencerClockTick()
    setClockBeat(true)
    setTimeout(() => setClockBeat(false), 80)
  }, [sequencerClockTick])

  const handleSequencerOutput = useCallback(
    (output: {
      cv: number
      gate: boolean
      slide: boolean
      ratchet: number
    }) => {
      const ac = ctx.current
      if (!ac) return
      const now = ac.currentTime
      seqCvSource.current?.offset.setTargetAtTime(
        output.cv,
        now,
        output.slide ? 0.04 : 0.005,
      )
      seqGateSource.current?.offset.setTargetAtTime(
        output.gate ? 1 : 0,
        now,
        0.001,
      )
      if (
        linked("seq-cv-out", "osc-voct-in") &&
        oscNode.current
      ) {
        oscNode.current.frequency.setTargetAtTime(
          midiToHz(60 + output.cv * 12),
          now,
          output.slide ? 0.04 : 0.005,
        )
      }
      // Ratchet subdivision is handled by the audio side consuming this externally clocked step.
      if (output.gate && linked("seq-gate-out", "adsr-gate-in")) triggerADSR()
    },
    [linked, triggerADSR],
  )

  // ── Clock interval ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (clockRef.current) clearInterval(clockRef.current)
    const interval = (60 / bpm) * 1000
    clockRef.current = setInterval(() => {
      if (!ctx.current) return
      if (linked("clock-out", "seq-clock-in")) stepSeq()
      if (linked("clock-out", "sample-clock-in")) sampleAndHold()
    }, interval)
    return () => {
      if (clockRef.current) clearInterval(clockRef.current)
    }
  }, [bpm, stepSeq, sampleAndHold, linked])

  // ── Param → audio sync ─────────────────────────────────────────────────────
  useEffect(() => {
    if (lfoNode.current && ctx.current)
      lfoNode.current.frequency.setTargetAtTime(
        lfoRate,
        ctx.current.currentTime,
        0.05,
      )
  }, [lfoRate])
  useEffect(() => {
    if (lfoGain.current && ctx.current) {
      const on = cables.some((cable) => cable.from === "lfo-out")
      lfoGain.current.gain.setTargetAtTime(
        on ? lfoDepth : 0,
        ctx.current.currentTime,
        0.05,
      )
    }
  }, [lfoDepth, cables])
  useEffect(() => {
    if (oscNode.current) oscNode.current.type = WAVEFORMS[oscWaveIdx]
  }, [oscWaveIdx])
  useEffect(() => {
    if (filterNode.current) filterNode.current.type = filterType
  }, [filterType])
  useEffect(() => {
    if (filterNode.current && ctx.current)
      filterNode.current.frequency.setTargetAtTime(
        filterCutoff,
        ctx.current.currentTime,
        0.05,
      )
  }, [filterCutoff])
  useEffect(() => {
    if (filterNode.current && ctx.current)
      filterNode.current.Q.setTargetAtTime(
        filterRes,
        ctx.current.currentTime,
        0.05,
      )
  }, [filterRes])
  useEffect(() => {
    if (masterGain.current && ctx.current)
      masterGain.current.gain.setTargetAtTime(
        masterVol,
        ctx.current.currentTime,
        0.05,
      )
  }, [masterVol])
  useEffect(() => {
    if (!reverbConv.current || !ctx.current) return
    reverbConv.current.buffer = buildImpulse(
      ctx.current,
      reverbSize,
      reverbMode,
      reverbReverse,
      reverbCharacter,
    )
  }, [
    reverbCharacter,
    reverbMode,
    reverbReverse,
    reverbSize,
    buildImpulse,
  ])
  useEffect(() => {
    if (!reverbPreDelayNode.current || !ctx.current) return
    reverbPreDelayNode.current.delayTime.setTargetAtTime(
      reverbPreDelay,
      ctx.current.currentTime,
      0.02,
    )
  }, [reverbPreDelay])
  useEffect(() => {
    if (!reverbWet.current || !ctx.current) return
    reverbWet.current.gain.setTargetAtTime(
      reverbMix,
      ctx.current.currentTime,
      0.05,
    )
  }, [reverbMix])
  useEffect(() => {
    if (
      delayNode.current &&
      ctx.current &&
      !linked("delay-clock-in", "clock-out")
    )
      delayNode.current.delayTime.setTargetAtTime(
        delayTime,
        ctx.current.currentTime,
        0.05,
      )
  }, [delayTime, linked])
  useEffect(() => {
    if (delayFbGain.current && ctx.current)
      delayFbGain.current.gain.setTargetAtTime(
        delayFb,
        ctx.current.currentTime,
        0.05,
      )
  }, [delayFb])
  useEffect(() => {
    if (!ctx.current) return
    if (delayWet.current)
      delayWet.current.gain.setTargetAtTime(
        delayMix,
        ctx.current.currentTime,
        0.05,
      )
    if (ppWet.current)
      ppWet.current.gain.setTargetAtTime(
        delayMix * 2,
        ctx.current.currentTime,
        0.05,
      )
  }, [delayMix])
  useEffect(() => {
    if (!ctx.current) return
    const clocked = linked("delay-clock-in", "clock-out")
    const t = 60 / bpm / ppDivision
    // Ping pong: sync to BPM only when clock-in is patched, otherwise use current value to avoid clicks
    if (clocked) {
      if (ppDelayL.current)
        ppDelayL.current.delayTime.setTargetAtTime(
          t,
          ctx.current.currentTime,
          0.01,
        )
      if (ppDelayR.current)
        ppDelayR.current.delayTime.setTargetAtTime(
          t * 2,
          ctx.current.currentTime,
          0.01,
        )
      if (delayNode.current)
        delayNode.current.delayTime.setTargetAtTime(
          60 / bpm,
          ctx.current.currentTime,
          0.01,
        )
    }
  }, [bpm, ppDivision, linked])
  useEffect(() => {
    if (ctx.current) syncGraph(cables)
  }, [pingPong]) // eslint-disable-line
  useEffect(() => {
    if (oscNode.current && ctx.current && !linked("seq-cv-out", "osc-voct-in"))
      oscNode.current.frequency.setTargetAtTime(
        oscFreq,
        ctx.current.currentTime,
        0.05,
      )
  }, [oscFreq, linked])
  useEffect(() => {
    noiseColorRef.current = noiseColor
    const ac = ctx.current
    const gain = noiseGain.current
    if (!ac || !gain) return
    const previous = noiseSource.current
    const next = ac.createBufferSource()
    next.buffer = createNoiseBuffer(ac, noiseColor)
    next.loop = true
    next.start()
    noiseSource.current = next
    if (previous) previous.stop()
    syncGraph(cablesRef.current)
  }, [noiseColor]) // eslint-disable-line
  useEffect(() => {
    noiseLevelRef.current = noiseLevel
    if (noiseGain.current && ctx.current)
      noiseGain.current.gain.setTargetAtTime(
        noiseLevel,
        ctx.current.currentTime,
        0.05,
      )
  }, [noiseLevel])
  useEffect(() => {
    ringModLevelRef.current = ringModLevelValue
    if (ringModLevel.current && ctx.current)
      ringModLevel.current.gain.setTargetAtTime(
        ringModLevelValue,
        ctx.current.currentTime,
        0.05,
      )
  }, [ringModLevelValue])
  useEffect(() => {
    sampleHoldInputGainRef.current = sampleHoldInputGain
  }, [sampleHoldInputGain])
  useEffect(() => {
    sampleHoldOffsetRef.current = sampleHoldOffset
  }, [sampleHoldOffset])
  useEffect(() => {
    sampleHoldSlewRef.current = sampleHoldSlew
  }, [sampleHoldSlew])
  useEffect(() => {
    if (wavefolder.current)
      wavefolder.current.curve = createWavefolderCurve(
        wavefolderFold,
        wavefolderBias,
      )
  }, [wavefolderFold, wavefolderBias])
  useEffect(() => {
    attenuverterAmountRef.current = attenuverterAmount
    if (attenuverterScale.current && ctx.current)
      attenuverterScale.current.gain.setTargetAtTime(
        attenuverterAmount,
        ctx.current.currentTime,
        0.05,
      )
  }, [attenuverterAmount])
  useEffect(() => {
    attenuverterOffsetRef.current = attenuverterOffsetValue
    if (attenuverterOffset.current && ctx.current)
      attenuverterOffset.current.offset.setTargetAtTime(
        attenuverterOffsetValue,
        ctx.current.currentTime,
        0.05,
      )
  }, [attenuverterOffsetValue])
  useEffect(() => {
    if (!ctx.current) return
    const now = ctx.current.currentTime
    if (!linked("seq-cv-out", "harmonic-v-oct-in")) {
      const oscillators = [
        ...harmonicOscillators.current,
        ...harmonicWaveOscillators.current,
      ]
      oscillators.forEach((oscillator, index) =>
        oscillator.frequency.setTargetAtTime(
          harmonicFrequency * (index < 8 ? index + 1 : 1),
          now,
          0.05,
        ),
      )
    }
    harmonicLinearFmDepths.current.forEach((depth, index) =>
      depth.gain.setTargetAtTime(
        harmonicFrequency * harmonicLinearFmDepth * (index < 8 ? index + 1 : 1),
        now,
        0.05,
      ),
    )
  }, [harmonicFrequency, harmonicLinearFmDepth, linked])
  useEffect(() => {
    if (!ctx.current) return
    harmonicGains.current.forEach((gain, index) => {
      gain.gain.setTargetAtTime(
        harmonicLevelFor(
          harmonicLevels[index],
          index,
          harmonicCenter,
          harmonicWidth,
          harmonicTilt,
        ),
        ctx.current!.currentTime,
        0.05,
      )
      harmonicCenterCvDepths.current[index].gain.setTargetAtTime(
        harmonicCenterCvDepthFor(
          harmonicLevels[index],
          index,
          harmonicCenter,
          harmonicWidth,
          harmonicTilt,
          harmonicCenterCvDepth,
        ),
        ctx.current!.currentTime,
        0.05,
      )
      harmonicWidthCvDepths.current[index].gain.setTargetAtTime(
        harmonicWidthCvDepthFor(
          harmonicLevels[index],
          index,
          harmonicCenter,
          harmonicWidth,
          harmonicTilt,
          harmonicWidthCvDepth,
        ),
        ctx.current!.currentTime,
        0.05,
      )
    })
  }, [
    harmonicCenter,
    harmonicCenterCvDepth,
    harmonicLevels,
    harmonicTilt,
    harmonicWidth,
    harmonicWidthCvDepth,
  ])
  useEffect(() => {
    if (harmonicOutput.current && ctx.current)
      harmonicOutput.current.gain.setTargetAtTime(
        harmonicMixGainFor(
          harmonicLevels,
          harmonicCenter,
          harmonicWidth,
          harmonicTilt,
        ),
        ctx.current.currentTime,
        0.05,
      )
  }, [harmonicLevels, harmonicCenter, harmonicWidth, harmonicTilt])
  useEffect(() => {
    harmonicExponentialFmDepths.current.forEach((depth) => {
      depth.gain.value = harmonicExponentialFmAmount * 1200
    })
  }, [harmonicExponentialFmAmount])
  useEffect(() => {
    channelGains.current.forEach((gain, index) => {
      if (ctx.current && channelLevels[index] !== undefined)
        gain.gain.setTargetAtTime(
          channelLevels[index],
          ctx.current.currentTime,
          0.05,
        )
    })
  }, [channelLevels])
  useEffect(() => {
    channelPanners.current.forEach((panner, index) => {
      if (ctx.current && channelPans[index] !== undefined)
        panner.pan.setTargetAtTime(
          channelPans[index],
          ctx.current.currentTime,
          0.05,
        )
    })
  }, [channelPans])
  useEffect(() => {
    granularParamsRef.current = {
      position: grainPosition,
      grainSize,
      pitch: grainPitch,
      inputGain: grainInputGain,
      density: grainDensity,
      texture: grainTexture,
      feedback: grainFeedback,
      mix: grainMix,
      frozen: granularFrozen,
    }
    granularLooper.current?.port.postMessage({
      type: "params",
      values: granularParamsRef.current,
    })
  }, [
    grainPosition,
    grainSize,
    grainPitch,
    grainInputGain,
    grainDensity,
    grainTexture,
    grainFeedback,
    grainMix,
    granularFrozen,
  ])
  useEffect(() => {
    cablesRef.current = cables
  }, [cables])
  useEffect(() => {
    if (granularReady) syncGraph(cables)
  }, [granularReady]) // eslint-disable-line
  useEffect(() => {
    if (spectralPhaserReady) syncGraph(cables)
  }, [spectralPhaserReady]) // eslint-disable-line
  useEffect(() => {
    const node = spectralPhaser.current
    const ac = ctx.current
    if (!node || !ac) return

    const parameters: [string, number][] = [
      ["rate", spectralPhaserSettings.rate],
      ["depth", spectralPhaserSettings.depth],
      ["resonance", spectralPhaserSettings.resonance],
      ["feedback", spectralPhaserSettings.feedback],
      ["mix", spectralPhaserSettings.mix],
      ["output", spectralPhaserSettings.output],
      ["low", spectralPhaserSettings.low],
      ["high1", spectralPhaserSettings.high1],
      ["high2", spectralPhaserSettings.high2],
      ["lowFrequency", spectralPhaserSettings.lowFrequency],
      ["high1Frequency", spectralPhaserSettings.high1Frequency],
      ["high2Frequency", spectralPhaserSettings.high2Frequency],
      ["sweep", spectralPhaserSettings.sweep],
      ["phase", spectralPhaserSettings.phase],
      ["stereoWidth", spectralPhaserSettings.stereoWidth],
      ["lowRate", spectralPhaserSettings.lowRate],
      ["highRate", spectralPhaserSettings.highRate],
      ["shape", spectralPhaserSettings.shape],
      ["sync", spectralPhaserSettings.sync ? 1 : 0],
      ["bpm", bpm],
    ]

    for (const [name, value] of parameters) {
      const parameter = node.parameters.get(name)
      if (!parameter) {
        setAudioError(`Spectral Phaser parameter "${name}" is unavailable.`)
        return
      }

      if (name === "shape" || name === "sync") {
        parameter.setValueAtTime(value, ac.currentTime)
      } else {
        parameter.setTargetAtTime(value, ac.currentTime, 0.02)
      }
    }
  }, [bpm, spectralPhaserReady, spectralPhaserSettings])
  useEffect(
    () => () => {
      const node = spectralPhaser.current
      if (!node) return
      node.disconnect()
      node.port.close()
      spectralPhaser.current = null
    },
    [],
  )
  useEffect(() => {
    vcaLevelRef.current = vcaLevel
    if (vcaGain.current && ctx.current)
      vcaGain.current.gain.setTargetAtTime(
        vcaLevel,
        ctx.current.currentTime,
        0.05,
      )
  }, [vcaLevel])
  useEffect(() => {
    attackRef.current = attack
  }, [attack])
  useEffect(() => {
    decayRef.current = decay
  }, [decay])
  useEffect(() => {
    sustainRef.current = sustain
  }, [sustain])
  useEffect(() => {
    releaseRef.current = release
  }, [release])

  // ── Waveform canvas ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = waveCanvas
    if (!canvas) return
    const c2d = canvas.getContext("2d")
    if (!c2d) return
    const buf = new Uint8Array(512)
    const draw = () => {
      animRef.current = requestAnimationFrame(draw)
      const an = analyser.current
      if (an) an.getByteTimeDomainData(buf)
      c2d.clearRect(0, 0, canvas.width, canvas.height)
      c2d.strokeStyle = WAVEFORM_COLOR
      c2d.lineWidth = 1.5
      c2d.beginPath()
      for (let i = 0; i < canvas.width; i++) {
        const v =
          (an ? buf[Math.floor((i * buf.length) / canvas.width)] : 128) / 128 -
          1
        const y = (v * canvas.height) / 2 + canvas.height / 2
        if (i === 0) c2d.moveTo(i, y)
        else c2d.lineTo(i, y)
      }
      c2d.stroke()
    }
    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [waveCanvas])

  // ── Mouse tracking ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const r = rackRef.current?.getBoundingClientRect()
      if (r)
        setMousePos({
          x: e.clientX - r.left,
          y: e.clientY - r.top,
        })
    }
    window.addEventListener("mousemove", onMove)
    return () => window.removeEventListener("mousemove", onMove)
  }, [])

  // ── Auto patch cables ──────────────────────────────────────────────────────
  const AUTO_PATCH_CABLES: Cable[] = [
    { from: "clock-out", to: "seq-clock-in", color: CABLE_COLORS[0] },
    { from: "clock-out", to: "delay-clock-in", color: CABLE_COLORS[0] },
    { from: "seq-cv-out", to: "osc-voct-in", color: CABLE_COLORS[1] },
    { from: "osc-out", to: "filter-audio-in", color: CABLE_COLORS[2] },
    { from: "lfo-out", to: "filter-cv-in", color: CABLE_COLORS[3] },
    { from: "lfo-out", to: "osc-fm-in", color: CABLE_COLORS[3] },
    { from: "filter-audio-out", to: "vca-audio-in", color: CABLE_COLORS[4] },
    { from: "adsr-env-out", to: "vca-cv-in", color: CABLE_COLORS[5] },
    { from: "seq-gate-out", to: "adsr-gate-in", color: CABLE_COLORS[6] },
    { from: "vca-out", to: "reverb-audio-in-l", color: CABLE_COLORS[7] },
    { from: "vca-out", to: "reverb-audio-in-r", color: CABLE_COLORS[7] },
    {
      from: "reverb-audio-out-l",
      to: "delay-audio-in-l",
      color: CABLE_COLORS[8],
    },
    {
      from: "reverb-audio-out-r",
      to: "delay-audio-in-r",
      color: CABLE_COLORS[8],
    },
    { from: "delay-audio-out-l", to: "out-in-l", color: CABLE_COLORS[9] },
    { from: "delay-audio-out-r", to: "out-in-r", color: CABLE_COLORS[9] },
  ]

  const doAutoPatch = useCallback(() => {
    initAudio()
    cablesRef.current = AUTO_PATCH_CABLES
    setCables(AUTO_PATCH_CABLES)
    setColorIdx(0)
    syncGraph(AUTO_PATCH_CABLES)
  }, [initAudio, syncGraph]) // eslint-disable-line

  useEffect(
    () => () => {
      if (graphSyncTimer.current) clearTimeout(graphSyncTimer.current)
    },
    [],
  )

  // ── Mobile: auto-patch on landscape entry ─────────────────────────────────
  useEffect(() => {
    if (isMobile && !isPortrait && !mobilePatchReady) {
      doAutoPatch()
      setMobilePatchReady(true)
    }
  }, [isMobile, isPortrait, mobilePatchReady, doAutoPatch])

  // ── Port click ─────────────────────────────────────────────────────────────
  const handlePortClick = useCallback(
    (portId: PortId) => {
      initAudio()
      const toDef = ALL_PORT_DEFS.find((p) => p.id === portId)!
      if (dragging) {
        if (dragging.portId === portId) {
          setDragging(null)
          return
        }
        const fromDef = ALL_PORT_DEFS.find((p) => p.id === dragging.portId)!
        if (fromDef.type === toDef.type) {
          setDragging(null)
          return
        }
        const dup = cables.some(
          (c) =>
            (c.from === dragging.portId && c.to === portId) ||
            (c.from === portId && c.to === dragging.portId),
        )
        if (dup) {
          setDragging(null)
          return
        }
        const cable: Cable = {
          from: fromDef.type === "output" ? dragging.portId : portId,
          to: fromDef.type === "output" ? portId : dragging.portId,
          color: dragging.color,
        }
        const nc = [...cables, cable]
        cablesRef.current = nc
        setCables(nc)
        setDragging(null)
        setColorIdx((i) => (i + 1) % CABLE_COLORS.length)
        syncGraph(nc)
      } else {
        const existIdx = cables.findIndex(
          (c) => c.from === portId || c.to === portId,
        )
        if (existIdx >= 0) {
          const nc = cables.filter((_, i) => i !== existIdx)
          cablesRef.current = nc
          setCables(nc)
          syncGraph(nc)
          return
        }
        setDragging({ portId, color: CABLE_COLORS[colorIdx] })
      }
    },
    [dragging, cables, colorIdx, initAudio, syncGraph],
  )

  // ── Cable helpers ──────────────────────────────────────────────────────────
  const getCenter = (id: PortId): Point | null => {
    const el = portRefs.current[id]
    const rack = rackRef.current
    if (!el || !rack) return null
    const pr = el.getBoundingClientRect()
    const rr = rack.getBoundingClientRect()
    return {
      x: pr.left + pr.width / 2 - rr.left,
      y: pr.top + pr.height / 2 - rr.top,
    }
  }

  const cablePath = (p1: Point, p2: Point) => {
    const dx = p2.x - p1.x
    const sag = Math.min(80, Math.abs(p2.y - p1.y) * 0.4 + 30)
    return `M${p1.x},${p1.y} C${p1.x + dx * 0.3},${p1.y + sag} ${
      p2.x - dx * 0.3
    },${p2.y + sag} ${p2.x},${p2.y}`
  }

  // ── Port render helper ─────────────────────────────────────────────────────
  const mkPort = (
    def: PortDef,
    orientation: "horizontal" | "vertical" = "horizontal",
  ) => {
    const fromDef = dragging
      ? ALL_PORT_DEFS.find((p) => p.id === dragging.portId)
      : null
    const highlighted =
      !!dragging && dragging.portId !== def.id && fromDef?.type !== def.type
    return (
      <Port
        key={def.id}
        def={def}
        connected={connectedPorts.has(def.id)}
        cableColor={
          cables.find((c) => c.from === def.id || c.to === def.id)?.color
        }
        highlighted={highlighted}
        dragging={!!dragging}
        orientation={orientation}
        onRef={(id, el) => {
          portRefs.current[id] = el ?? undefined
        }}
        onClick={handlePortClick}
      />
    )
  }

  // ── MOBILE: Portrait — rotate prompt ──────────────────────────────────────
  if (isMobile && isPortrait) {
    return (
      <div
        style={{
          width: "100%",
          height: "100dvh",
          background: "transparent",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          userSelect: "none",
        }}
      >
        <div
          style={{
            width: 40,
            height: 1,
            background: "var(--line-strong)",
            marginBottom: "2rem",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(28px, 10vw, 42px)",
            fontWeight: 500,
            color: "var(--ink)",
            letterSpacing: "0.08em",
            lineHeight: 1,
            textAlign: "center",
          }}
        >
          PLAYGROUND
        </span>
        <div
          style={{
            width: "100%",
            maxWidth: 200,
            height: 1,
            background: "var(--line)",
            margin: "1.5rem 0",
          }}
        />
        <span style={{ fontSize: "2rem", marginBottom: "1rem", opacity: 0.5 }}>
          ⟳
        </span>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "11px",
            color: "var(--muted)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            textAlign: "center",
            lineHeight: 2.2,
          }}
        >
          rotate to landscape
          <br />
          to load the synth
        </span>
        <div
          style={{
            width: 40,
            height: 1,
            background: "var(--line-strong)",
            marginTop: "2rem",
          }}
        />
        <a
          href="https://ritasilva.online"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            color: "var(--accent-primary)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            textDecoration: "none",
            marginTop: "3rem",
          }}
        >
          ritasilva.online
        </a>
      </div>
    )
  }

  // ── MOBILE: Landscape — compact performance view ─────────────────────────
  if (isMobile && !isPortrait && !mobileShowFullRack) {
    // mini patch view (modules + cables) from actual patch
    // Rack layout for auto-patch: CLK → SEQ → OSCILLATOR → FILTER → VCA → REVERB → DELAY → AUDIO OUT
    const MINI_MODULES = [
      { id: "clock", label: "clock", tone: "clock" },
      { id: "seq", label: "seq", tone: "sequencer" },
      { id: "osc", label: "oscillator", tone: "oscillator" },
      { id: "filter", label: "filt", tone: "filter" },
      { id: "vca", label: "vca", tone: "vca" },
      { id: "reverb", label: "rvb", tone: "reverb" },
      { id: "delay", label: "dly", tone: "delay" },
      { id: "out", label: "audio out", tone: "output" },
    ]
    // cable colour mapping for mini patch view (matches auto-patch cables)
    const cableColorMap: Record<string, string> = {
      "clock-out-seq-clock-in": CABLE_COLORS[0],
      "clock-out-delay-clock-in": CABLE_COLORS[0],
      "seq-cv-out-osc-voct-in": CABLE_COLORS[1],
      "osc-out-filter-audio-in": CABLE_COLORS[2],
      "lfo-out-filter-cv-in": CABLE_COLORS[3],
      "lfo-out-osc-fm-in": CABLE_COLORS[3],
      "filter-audio-out-vca-audio-in": CABLE_COLORS[4],
      "adsr-env-out-vca-cv-in": CABLE_COLORS[5],
      "seq-gate-out-adsr-gate-in": CABLE_COLORS[6],
      "vca-out-reverb-audio-in-l": CABLE_COLORS[7],
      "vca-out-reverb-audio-in-r": CABLE_COLORS[7],
      "reverb-audio-out-l-delay-audio-in-l": CABLE_COLORS[8],
      "reverb-audio-out-r-delay-audio-in-r": CABLE_COLORS[8],
      "delay-audio-out-l-out-in-l": CABLE_COLORS[9],
      "delay-audio-out-r-out-in-r": CABLE_COLORS[9],
    }
    // derive cables for mini patch view from actual cables, using colour mapping above
    const miniCables = cables
      .filter((c) => {
        const key1 = `${c.from}-${c.to}`
        const key2 = `${c.to}-${c.from}`
        return cableColorMap[key1] || cableColorMap[key2]
      })
      .map((c) => {
        const key1 = `${c.from}-${c.to}`
        const key2 = `${c.to}-${c.from}`
        return {
          from: c.from.split("-")[0], // get module id from port id
          to: c.to.split("-")[0],
          color: cableColorMap[key1] || cableColorMap[key2] || "var(--surface)",
        }
      })

    // SVG layout constants
    const BOX_W = 38
    const BOX_H = 24
    const GAP = 16
    const boxWidths = MINI_MODULES.map((mod) =>
      mod.id === "osc" ? 52 : mod.id === "out" ? 50 : BOX_W,
    )
    const SVG_W =
      boxWidths.reduce((total, width) => total + width, 0) +
      (boxWidths.length - 1) * GAP
    const SVG_H = 90
    const BOX_Y = 30 // y position of module boxes
    const PORT_Y = BOX_Y + BOX_H // bottom port y
    const TOP_PORT_Y = BOX_Y // top port y

    // Centre x of module box by index
    const cx = (i: number) =>
      boxWidths.slice(0, i).reduce((total, width) => total + width + GAP, 0) +
      boxWidths[i] / 2

    // Module index lookup
    const modIndex = (id: string) => MINI_MODULES.findIndex((m) => m.id === id)

    // Separate sidechain cables (LFO→filter, ADSR→vca, seq-gate→adsr)
    // from main chain cables so we can draw them differently
    const SIDECHAIN_IDS = new Set(["lfo", "adsr"])
    const mainCables = miniCables.filter((c) => !SIDECHAIN_IDS.has(c.from))
    const sidechainCables = miniCables.filter((c) => SIDECHAIN_IDS.has(c.from))

    return (
      <div
        style={{
          width: "100%",
          height: "100dvh",
          background: "transparent",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem 1.5rem",
          userSelect: "none",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "22px",
            fontWeight: 500,
            color: "var(--ink)",
            letterSpacing: "0.08em",
            marginBottom: "2px",
          }}
        >
          PLAYGROUND
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "7px",
            color: "var(--accent-primary)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "18px",
          }}
        >
          preset — auto patch
        </span>

        {/* Mini patch SVG */}
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{
            width: "min(90vw, 480px)",
            height: "auto",
            overflow: "visible",
            marginBottom: "18px",
          }}
        >
          {/* Main chain cables — curved paths between module bottom ports */}
          {mainCables.map((cable, i) => {
            const fromIdx = modIndex(cable.from)
            const toIdx = modIndex(cable.to)
            if (fromIdx < 0 || toIdx < 0) return null
            const x1 = cx(fromIdx)
            const x2 = cx(toIdx)
            const sag = 20
            return (
              <path
                key={`main-${i}`}
                d={`M${x1},${PORT_Y} C${x1},${PORT_Y + sag} ${x2},${
                  PORT_Y + sag
                } ${x2},${PORT_Y}`}
                stroke={cable.color}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                opacity="0.9"
              />
            )
          })}

          {/* Sidechain cables — dashed lines dropping into module top ports */}
          {sidechainCables.map((cable, i) => {
            const toIdx = modIndex(cable.to)
            if (toIdx < 0) return null
            const x = cx(toIdx)
            const labelY = TOP_PORT_Y - 18
            return (
              <g key={`side-${i}`}>
                <text
                  x={x}
                  y={labelY}
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "6px",
                    fill: cable.color,
                    letterSpacing: "0.08em",
                    fontWeight: 700,
                  }}
                >
                  {cable.from.toUpperCase()}
                </text>
                <line
                  x1={x}
                  y1={labelY + 4}
                  x2={x}
                  y2={TOP_PORT_Y}
                  stroke={cable.color}
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                  opacity="0.75"
                />
                <circle
                  cx={x}
                  cy={TOP_PORT_Y}
                  r="2"
                  fill={cable.color}
                  opacity="0.9"
                />
              </g>
            )
          })}

          {/* Module boxes */}
          {MINI_MODULES.map((mod, i) => (
            <g key={mod.id}>
              <rect
                x={cx(i) - boxWidths[i] / 2}
                y={BOX_Y}
                width={boxWidths[i]}
                height={BOX_H}
                rx={3}
                fill={`color-mix(in srgb, var(--tone-${mod.tone}) 15%, var(--surface))`}
                stroke={`color-mix(in srgb, var(--tone-${mod.tone}) 55%, var(--line))`}
                strokeWidth="1"
              />
              <text
                x={cx(i)}
                y={BOX_Y + BOX_H / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "7px",
                  fill: "var(--ink)",
                  letterSpacing: "0.06em",
                  fontWeight: 700,
                }}
              >
                {mod.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Vol knob */}
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "8px",
            color: "var(--muted)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          master volume
        </span>
        <Knob
          value={masterVol}
          min={0}
          max={1}
          label="level"
          sublabel={formatGainDb(masterVol)}
          size={52}
          onChange={(v) => {
            setMasterVol(v)
            if (masterGain.current && ctx.current)
              masterGain.current.gain.setTargetAtTime(
                v,
                ctx.current.currentTime,
                0.05,
              )
          }}
        />
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: mobilePatchReady
              ? "var(--tone-lfo)"
              : "color-mix(in srgb, var(--tone-lfo) 16%, var(--surface))",
            boxShadow: mobilePatchReady
              ? "0 0 8px color-mix(in srgb, var(--tone-lfo) 45%, transparent)"
              : "none",
            marginTop: "16px",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "7px",
            color: mobilePatchReady ? "var(--tone-lfo)" : "var(--muted)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginTop: "6px",
          }}
        >
          {mobilePatchReady ? "playing" : "loading..."}
        </span>
        {(audioError || patchError) && (
          <span
            role="alert"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "8px",
              color: "var(--tone-output)",
              marginTop: "8px",
            }}
          >
            {audioError ?? patchError}
          </span>
        )}
        <button
          type="button"
          onClick={() => setMobileShowFullRack(true)}
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink)",
            background: "var(--surface)",
            border: "1px solid var(--line-strong)",
            borderRadius: "4px",
            padding: "8px 14px",
            marginTop: "18px",
          }}
        >
          open full rack
        </button>
        <a
          href="https://ritasilva.online"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "8px",
            color: "var(--muted)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            textDecoration: "none",
            marginTop: "auto",
            paddingTop: "2rem",
          }}
        >
          ritasilva.online
        </a>
      </div>
    )
  }

  // ── DESKTOP / TABLET: Full rack ────────────────────────────────────────────
  const mobileFullRack = isMobile && !isPortrait
  return (
    <div
      style={{
        position: "relative",
        width: mobileFullRack ? "100vw" : fitSize.width,
        height: mobileFullRack ? "100dvh" : fitSize.height,
        overflow: mobileFullRack ? "auto" : "visible",
        overscrollBehavior: mobileFullRack ? "contain" : "auto",
        marginInline: mobileFullRack ? 0 : "auto",
        flexShrink: 0,
      }}
    >
      <div
        ref={fitContentRef}
        className="flex flex-col items-center gap-3 p-4 select-none w-max"
        style={{
          position: mobileFullRack ? "relative" : "absolute",
          top: 0,
          left: 0,
          cursor: dragging ? "none" : "default",
        }}
      >
        {mobileFullRack && (
          <button
            type="button"
            onClick={() => setMobileShowFullRack(false)}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink)",
              background: "var(--surface)",
              border: "1px solid var(--line-strong)",
              borderRadius: "4px",
              padding: "8px 14px",
            }}
          >
            back to performance view
          </button>
        )}
        <header className="desktop-brand">
          <div className="desktop-brand__eyebrow">Rita Silva · Experiments</div>
          <h1 className="desktop-brand__title">Modular Synth</h1>
          <p className="desktop-brand__tagline">
            An interactive space for sound exploration.
          </p>
        </header>
        <div
          ref={rackRef}
          className="rack-shell relative flex flex-col gap-[3px]"
          style={{
            width: "fit-content",
            //marginBottom: "120px",
          }}
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest("[data-port]") && dragging)
              setDragging(null)
          }}
        >
          {/* SVG cable layer */}
          <svg
            className="absolute pointer-events-none"
            style={{
              top: 0,
              left: 0,
              width: "100%",
              height: "calc(100% + 120px)",
              overflow: "visible",
              zIndex: 20,
            }}
          >
            {cables.map((cable, i) => {
              const p1 = getCenter(cable.from),
                p2 = getCenter(cable.to)
              if (!p1 || !p2) return null
              return (
                <g key={i}>
                  <path
                    d={cablePath(p1, p2)}
                    stroke={cable.color}
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                  <circle
                    cx={p1.x}
                    cy={p1.y}
                    r="4.5"
                    fill={cable.color}
                    stroke="var(--surface)"
                    strokeWidth="1"
                  />
                  <circle
                    cx={p2.x}
                    cy={p2.y}
                    r="4.5"
                    fill={cable.color}
                    stroke="var(--surface)"
                    strokeWidth="1"
                  />
                </g>
              )
            })}
            {dragging &&
              (() => {
                const p1 = getCenter(dragging.portId)
                if (!p1) return null
                return (
                  <g>
                    <path
                      d={cablePath(p1, mousePos)}
                      stroke={dragging.color}
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      opacity="0.55"
                      strokeDasharray="6 4"
                    />
                    <circle
                      cx={mousePos.x}
                      cy={mousePos.y}
                      r="6"
                      fill={dragging.color}
                      stroke="var(--surface)"
                      strokeWidth="1.5"
                    />
                    <line
                      x1={mousePos.x}
                      y1={mousePos.y + 6}
                      x2={mousePos.x}
                      y2={mousePos.y + 14}
                      stroke={dragging.color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </g>
                )
              })()}
          </svg>

          <div className="rack-row rack-row--sources flex gap-[3px]">
            <ClockModule
              bpm={bpm}
              clockBeat={clockBeat}
              onBpmChange={setBpm}
              mkPort={mkPort}
            />
            <SequencerModule
              seqStep={seqStep}
              seqNotes={seqNotes}
              scaleIdx={scaleIdx}
              rootIdx={rootIdx}
              onScaleChange={(index) =>
                sequencer.dispatch({
                  type: "SET_SCALE",
                  value: SCALE_NAMES[index],
                })
              }
              onRootChange={(index) =>
                sequencer.dispatch({ type: "SET_ROOT", value: index })
              }
              onNoteChange={(index, value) =>
                sequencer.dispatch({
                  type: "SET_STEP_PARAM",
                  index,
                  key: "note",
                  value,
                })
              }
              mkPort={mkPort}
              sequencer={sequencer}
              onStepOut={handleSequencerOutput}
            />
            <LfoModule
              lfoRate={lfoRate}
              lfoDepth={lfoDepth}
              onRateChange={setLfoRate}
              onDepthChange={setLfoDepth}
              mkPort={mkPort}
            />
            <OscillatorModule
              oscFreq={oscFreq}
              oscWaveIdx={oscWaveIdx}
              onFreqChange={setOscFreq}
              onWaveChange={(value) => setOscWaveIdx(Math.round(value))}
              mkPort={mkPort}
            />
            <HarmonicOscillatorModule
              frequency={harmonicFrequency}
              levels={harmonicLevels}
              center={harmonicCenter}
              width={harmonicWidth}
              tilt={harmonicTilt}
              linearFmDepth={harmonicLinearFmDepth}
              exponentialFmAmount={harmonicExponentialFmAmount}
              centerCvDepth={harmonicCenterCvDepth}
              widthCvDepth={harmonicWidthCvDepth}
              onFrequencyChange={setHarmonicFrequency}
              onLevelChange={(partial, level) =>
                setHarmonicLevels((current) =>
                  current.map((value, index) =>
                    index === partial ? level : value,
                  ),
                )
              }
              onCenterChange={setHarmonicCenter}
              onWidthChange={setHarmonicWidth}
              onTiltChange={setHarmonicTilt}
              onLinearFmDepthChange={setHarmonicLinearFmDepth}
              onExponentialFmAmountChange={setHarmonicExponentialFmAmount}
              onCenterCvDepthChange={setHarmonicCenterCvDepth}
              onWidthCvDepthChange={setHarmonicWidthCvDepth}
              mkPort={mkPort}
            />
            <AttenuverterModule
              amount={attenuverterAmount}
              offset={attenuverterOffsetValue}
              onAmountChange={setAttenuverterAmount}
              onOffsetChange={setAttenuverterOffsetValue}
              mkPort={mkPort}
            />
            <NoiseModule
              color={noiseColor}
              level={noiseLevel}
              onColorChange={setNoiseColor}
              onLevelChange={setNoiseLevel}
              mkPort={mkPort}
            />
            <RingModModule
              level={ringModLevelValue}
              onLevelChange={setRingModLevelValue}
              mkPort={mkPort}
            />
            <SpectralPhaserModule
              settings={spectralPhaserSettings}
              onSettingsChange={updateSpectralPhaserSettings}
              bpm={bpm}
              mkPort={mkPort}
            />
          </div>

          <div className="rack-row rack-row--processing flex gap-[3px]">
            <SampleHoldModule
              inputGain={sampleHoldInputGain}
              offset={sampleHoldOffset}
              slew={sampleHoldSlew}
              onInputGainChange={setSampleHoldInputGain}
              onOffsetChange={setSampleHoldOffset}
              onSlewChange={setSampleHoldSlew}
              mkPort={mkPort}
            />
            <EnvelopeModule
              attack={attack}
              decay={decay}
              sustain={sustain}
              release={release}
              onAttackChange={setAttack}
              onDecayChange={setDecay}
              onSustainChange={setSustain}
              onReleaseChange={setRelease}
              mkPort={mkPort}
            />
            <FilterModule
              filterType={filterType}
              filterCutoff={filterCutoff}
              filterRes={filterRes}
              onTypeChange={setFilterType}
              onCutoffChange={setFilterCutoff}
              onResChange={setFilterRes}
              mkPort={mkPort}
            />
            <VcaModule
              vcaLevel={vcaLevel}
              onLevelChange={updateVcaLevel}
              waveRef={waveRef}
              mkPort={mkPort}
            />
            <WavefolderModule
              fold={wavefolderFold}
              bias={wavefolderBias}
              onFoldChange={setWavefolderFold}
              onBiasChange={setWavefolderBias}
              mkPort={mkPort}
            />
            <CloudyModule
              position={grainPosition}
              grainSize={grainSize}
              pitch={grainPitch}
              inputGain={grainInputGain}
              density={grainDensity}
              texture={grainTexture}
              feedback={grainFeedback}
              blend={grainMix}
              frozen={granularFrozen}
              onPositionChange={setGrainPosition}
              onGrainSizeChange={setGrainSize}
              onPitchChange={setGrainPitch}
              onInputGainChange={setGrainInputGain}
              onDensityChange={setGrainDensity}
              onTextureChange={setGrainTexture}
              onFeedbackChange={setGrainFeedback}
              onBlendChange={setGrainMix}
              onFreezeToggle={() => setGranularFrozen((current) => !current)}
              mkPort={mkPort}
            />
            <ReverbModule
              reverbSize={reverbSize}
              reverbMix={reverbMix}
              reverbPreDelay={reverbPreDelay}
              reverbCharacter={reverbCharacter}
              reverbMode={reverbMode}
              reverbReverse={reverbReverse}
              onSizeChange={setReverbSize}
              onMixChange={setReverbMix}
              onPreDelayChange={setReverbPreDelay}
              onCharacterChange={setReverbCharacter}
              onModeChange={setReverbMode}
              onReverseToggle={() => setReverbReverse((reverse) => !reverse)}
              mkPort={mkPort}
            />
            <DelayModule
              delayTime={delayTime}
              delayFb={delayFb}
              delayMix={delayMix}
              pingPong={pingPong}
              ppDivision={ppDivision}
              ppDelayTime={ppDelayTime}
              bpm={bpm}
              clocked={linked("delay-clock-in", "clock-out")}
              onPpDivisionChange={setPpDivision}
              onTimeChange={setDelayTime}
              onFbChange={setDelayFb}
              onMixChange={setDelayMix}
              onPingPongToggle={setPingPong}
              mkPort={mkPort}
            />
            <ChannelMixerModule
              levels={channelLevels}
              pans={channelPans}
              onLevelChange={(channel, level) =>
                setChannelLevels((current) =>
                  current.map((value, index) =>
                    index === channel ? level : value,
                  ),
                )
              }
              onPanChange={(channel, pan) =>
                setChannelPans((current) =>
                  current.map((value, index) =>
                    index === channel ? pan : value,
                  ),
                )
              }
              meters={channelMeterAnalyzers}
              mkPort={mkPort}
            />
            <MixerModule
              masterVol={masterVol}
              isActive={
                connectedPorts.has("out-in-l") ||
                connectedPorts.has("out-in-r")
              }
              analyser={outputMeterAnalyser}
              onVolChange={setMasterVol}
              mkPort={mkPort}
            />
          </div>
        </div>

        {/* Status + controls */}
        <div
          className="flex flex-col items-center w-full"
          style={{
            maxWidth: "fit-content",
            marginTop: "24px",
          }}
        >
          {audioError && (
            <span
              role="alert"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                color: "var(--tone-output)",
                marginBottom: "8px",
              }}
            >
              {audioError}
            </span>
          )}
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.05em",
              color: dragging
                ? "var(--accent-primary)"
                : cables.length > 0
                  ? "var(--tone-lfo)"
                  : "var(--muted)",
            }}
          >
            {dragging
              ? "click destination port to connect"
              : cables.length === 0
                ? "patch a cable to start"
                : `${cables.length} cable${cables.length !== 1 ? "s" : ""} patched`}
          </span>
          <div className="flex gap-2" style={{ marginTop: "16px" }}>
            <button
              onClick={() => {
                cablesRef.current = []
                setCables([])
                syncGraph([])
                setDragging(null)
              }}
              onMouseEnter={() => setBtnHover("clear")}
              onMouseLeave={() => {
                setBtnHover(null)
                setBtnPress(null)
              }}
              onMouseDown={() => setBtnPress("clear")}
              onMouseUp={() => setBtnPress(null)}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                padding: "6px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                background:
                  btnPress === "clear"
                    ? "var(--accent-primary)"
                    : btnHover === "clear"
                      ? "color-mix(in srgb, var(--accent-primary) 16%, var(--surface))"
                      : "var(--surface)",
                color:
                  btnPress === "clear"
                    ? "var(--surface)"
                    : btnHover === "clear"
                      ? "var(--accent-primary)"
                      : "var(--muted)",
                border:
                  btnPress === "clear"
                    ? "1px solid var(--accent-primary)"
                    : btnHover === "clear"
                      ? "1px solid color-mix(in srgb, var(--accent-primary) 52%, var(--line))"
                      : "1px solid var(--line)",
                transition: "background 0.1s, color 0.1s, border-color 0.1s",
              }}
            >
              clear all
            </button>
            <button
              onClick={doAutoPatch}
              onMouseEnter={() => setBtnHover("patch")}
              onMouseLeave={() => {
                setBtnHover(null)
                setBtnPress(null)
              }}
              onMouseDown={() => setBtnPress("patch")}
              onMouseUp={() => setBtnPress(null)}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                padding: "6px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                background:
                  btnPress === "patch"
                    ? "var(--accent-primary)"
                    : btnHover === "patch"
                      ? "color-mix(in srgb, var(--accent-primary) 16%, var(--surface))"
                      : "var(--surface)",
                color:
                  btnPress === "patch"
                    ? "var(--surface)"
                    : btnHover === "patch"
                      ? "var(--accent-primary)"
                      : "var(--muted)",
                border:
                  btnPress === "patch"
                    ? "1px solid var(--accent-primary)"
                    : btnHover === "patch"
                      ? "1px solid color-mix(in srgb, var(--accent-primary) 52%, var(--line))"
                      : "1px solid var(--line-strong)",
                transition: "background 0.1s, color 0.1s, border-color 0.1s",
              }}
            >
              auto patch
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
