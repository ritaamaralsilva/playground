import type { PortId, Cable } from "./types"
import { WAVEFORMS } from "./constants"

export type LinkedFn = (a: PortId, b: PortId) => boolean

export function buildImpulse(ac: AudioContext, size: number): AudioBuffer {
  const rate = ac.sampleRate
  const length = rate * (0.5 + size * 3.5)
  const buf = ac.createBuffer(2, length, rate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 1.5 + size)
    }
  }
  return buf
}

export interface AudioNodes {
  ctx: AudioContext
  oscNode: OscillatorNode
  lfoNode: OscillatorNode
  lfoGain: GainNode
  seqCvGain: GainNode
  filterNode: BiquadFilterNode
  vcaGain: GainNode
  adsrEnvGain: GainNode
  reverbConv: ConvolverNode
  reverbWet: GainNode
  reverbDry: GainNode
  delayNode: DelayNode
  delayFbGain: GainNode
  delayWet: GainNode
  masterGain: GainNode
  analyser: AnalyserNode
}

export function initAudioEngine(params: {
  oscFreq: number
  oscWaveIdx: number
  lfoRate: number
  filterType: BiquadFilterType
  filterCutoff: number
  filterRes: number
  vcaLevel: number
  reverbSize: number
  reverbMix: number
  delayTime: number
  delayFb: number
  delayMix: number
  masterVol: number
}): AudioNodes {
  const ac = new AudioContext()

  // OSC
  const oscNode = ac.createOscillator()
  oscNode.type = WAVEFORMS[params.oscWaveIdx]
  oscNode.frequency.value = params.oscFreq
  oscNode.start()

  // LFO
  const lfoNode = ac.createOscillator()
  lfoNode.type = "sine"
  lfoNode.frequency.value = params.lfoRate
  lfoNode.start()
  const lfoGain = ac.createGain()
  lfoGain.gain.value = 0
  lfoNode.connect(lfoGain)

  // Seq CV gain
  const seqCvGain = ac.createGain()
  seqCvGain.gain.value = 0

  // Filter
  const filterNode = ac.createBiquadFilter()
  filterNode.type = params.filterType
  filterNode.frequency.value = params.filterCutoff
  filterNode.Q.value = params.filterRes

  // VCA
  const vcaGain = ac.createGain()
  vcaGain.gain.value = params.vcaLevel

  // ADSR env gain
  const adsrEnvGain = ac.createGain()
  adsrEnvGain.gain.value = 0

  // Reverb
  const reverbConv = ac.createConvolver()
  reverbConv.buffer = buildImpulse(ac, params.reverbSize)
  const reverbWet = ac.createGain()
  reverbWet.gain.value = params.reverbMix
  const reverbDry = ac.createGain()
  reverbDry.gain.value = 1 - params.reverbMix
  reverbConv.connect(reverbWet)

  // Delay
  const delayNode = ac.createDelay(4)
  delayNode.delayTime.value = params.delayTime
  const delayFbGain = ac.createGain()
  delayFbGain.gain.value = params.delayFb
  const delayWet = ac.createGain()
  delayWet.gain.value = params.delayMix
  delayNode.connect(delayFbGain)
  delayFbGain.connect(delayNode)
  delayNode.connect(delayWet)

  // Master
  const masterGain = ac.createGain()
  masterGain.gain.value = params.masterVol
  const analyser = ac.createAnalyser()
  analyser.fftSize = 512
  masterGain.connect(ac.destination)
  masterGain.connect(analyser)

  return {
    ctx,
    oscNode,
    lfoNode,
    lfoGain,
    seqCvGain,
    filterNode,
    vcaGain,
    adsrEnvGain,
    reverbConv,
    reverbWet,
    reverbDry,
    delayNode,
    delayFbGain,
    delayWet,
    masterGain,
    analyser,
  }
}

export function syncGraph(
  nodes: AudioNodes,
  newCables: Cable[],
  lfoDepth: number,
  masterVol: number
) {
  const {
    ctx: ac,
    oscNode,
    lfoGain,
    filterNode,
    vcaGain,
    reverbConv,
    reverbWet,
    reverbDry,
    delayNode,
    delayWet,
    masterGain,
    analyser,
  } = nodes

  const map = newCables.reduce<Partial<Record<PortId, PortId>>>((a, c) => {
    a[c.from] = c.to
    a[c.to] = c.from
    return a
  }, {})
  const lk: LinkedFn = (a, b) => map[a] === b || map[b] === a

  // Disconnect everything safely
  ;[
    oscNode,
    lfoGain,
    filterNode,
    vcaGain,
    reverbWet,
    reverbDry,
    delayWet,
    masterGain,
  ].forEach((n) => {
    try {
      n.disconnect()
    } catch {}
  })

  // Reconnect master always
  masterGain.connect(ac.destination)
  masterGain.connect(analyser)

  // Reconnect reverb conv → wet (lost on disconnect)
  reverbConv.connect(reverbWet)

  // LFO routing
  if (lk("lfo-out", "filter-cv-in")) lfoGain.connect(filterNode.frequency)
  if (lk("lfo-out", "osc-fm-in")) lfoGain.connect(oscNode.frequency)

  lfoGain.gain.setTargetAtTime(
    lk("lfo-out", "osc-fm-in") || lk("lfo-out", "filter-cv-in") ? lfoDepth : 0,
    ac.currentTime,
    0.05
  )

  // Audio signal chain
  if (lk("osc-out", "filter-audio-in")) {
    oscNode.connect(filterNode)
    let sig: AudioNode = filterNode
    if (lk("filter-audio-out", "vca-audio-in")) {
      filterNode.connect(vcaGain)
      sig = vcaGain
    }
    routeToFX(sig, lk, nodes, masterGain)
  } else if (lk("osc-out", "vca-audio-in")) {
    oscNode.connect(vcaGain)
    routeToFX(vcaGain, lk, nodes, masterGain)
  } else if (lk("osc-out", "reverb-audio-in")) {
    oscNode.connect(reverbConv)
    oscNode.connect(reverbDry)
    if (lk("reverb-audio-out", "out-in")) {
      reverbWet.connect(masterGain)
      reverbDry.connect(masterGain)
    }
  } else if (lk("osc-out", "delay-audio-in")) {
    oscNode.connect(delayNode)
    if (lk("delay-audio-out", "out-in")) {
      delayWet.connect(masterGain)
      oscNode.connect(masterGain)
    }
  } else if (lk("osc-out", "out-in")) {
    oscNode.connect(masterGain)
  }

  masterGain.gain.setTargetAtTime(masterVol, ac.currentTime, 0.05)
}

function routeToFX(
  src: AudioNode,
  lk: LinkedFn,
  nodes: AudioNodes,
  master: GainNode
) {
  const { reverbConv, reverbWet, reverbDry, delayNode, delayWet } = nodes

  if (
    lk("reverb-audio-in", "vca-out") ||
    lk("reverb-audio-in", "filter-audio-out")
  ) {
    src.connect(reverbConv)
    src.connect(reverbDry)
    if (lk("reverb-audio-out", "delay-audio-in")) {
      reverbWet.connect(delayNode)
      reverbDry.connect(delayNode)
      delayNode.connect(master)
      delayWet.connect(master)
    } else if (lk("reverb-audio-out", "out-in")) {
      reverbWet.connect(master)
      reverbDry.connect(master)
    }
    return
  }
  if (
    lk("delay-audio-in", "vca-out") ||
    lk("delay-audio-in", "filter-audio-out")
  ) {
    src.connect(delayNode)
    src.connect(master)
    if (lk("delay-audio-out", "out-in")) delayWet.connect(master)
    return
  }
  if (lk("vca-out", "out-in") || lk("filter-audio-out", "out-in")) {
    src.connect(master)
  }
}

export function triggerADSR(
  ac: AudioContext,
  vcaGain: GainNode,
  vcaLevel: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number
) {
  const now = ac.currentTime
  vcaGain.gain.cancelScheduledValues(now)
  vcaGain.gain.setValueAtTime(0, now)
  vcaGain.gain.linearRampToValueAtTime(vcaLevel, now + attack)
  vcaGain.gain.linearRampToValueAtTime(vcaLevel * sustain, now + attack + decay)
  vcaGain.gain.setValueAtTime(vcaLevel * sustain, now + attack + decay)
  vcaGain.gain.linearRampToValueAtTime(0, now + attack + decay + 0.05 + release)
}
