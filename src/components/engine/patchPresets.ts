/** Ready-to-play built-in Eurorack patch chains for the Auto Patch selector. */
import { CABLE_COLORS } from "./constants"
import type { Cable, PortId } from "./types"
import type { SequencerState, Step } from "./sequencerTypes"

export interface PatchPreset {
  id: string
  name: string
  description: string
  cables: Cable[]
  sequence?: SequencerState
  channelPans?: readonly number[]
  modulation?: {
    lfoRate: number
    lfoDepth: number
    harmonicCenterCvDepth: number
    harmonicWidthCvDepth: number
    harmonicExponentialFmAmount: number
  }
}

type Route = readonly [from: PortId, to: PortId, colorIndex: number]

function makeStep(note: number, overrides: Partial<Step> = {}): Step {
  return {
    note,
    gate: true,
    gateLen: 0.62,
    prob: 1,
    ratchet: 1,
    slide: false,
    ...overrides,
  }
}

function makeCables(routes: readonly Route[]): Cable[] {
  return routes.map(([from, to, colorIndex]) => {
    const color = CABLE_COLORS[colorIndex]
    if (!color) throw new RangeError(`Unknown cable color index: ${colorIndex}`)
    return { from, to, color }
  })
}

const HARMONICA_SEQUENCE: SequencerState = {
  name: "Harmonica E minor",
  steps: [
    makeStep(64),
    makeStep(71),
    makeStep(67, { gateLen: 0.48 }),
    makeStep(74),
    makeStep(76, { slide: true }),
    makeStep(71, { prob: 0.9 }),
    makeStep(79, { gateLen: 0.48 }),
    makeStep(74),
  ],
  length: 8,
  direction: "fwd",
  clockDiv: 1,
  transpose: 0,
  scale: "minor",
  root: 4,
}

export const PATCH_PRESETS: readonly PatchPreset[] = [
  {
    id: "clocked-voice",
    name: "Clocked Voice",
    description: "Sequenced oscillator through filter, reverb, and delay.",
    cables: makeCables([
      ["clock-out", "seq-clock-in", 0],
      ["clock-out", "delay-clock-in", 0],
      ["seq-cv-out", "osc-voct-in", 1],
      ["osc-out", "filter-audio-in", 2],
      ["lfo-out", "filter-cv-in", 3],
      ["lfo-out", "osc-fm-in", 3],
      ["filter-audio-out", "vca-audio-in", 4],
      ["adsr-env-out", "vca-cv-in", 5],
      ["seq-gate-out", "adsr-gate-in", 6],
      ["vca-out", "reverb-audio-in-l", 7],
      ["vca-out", "reverb-audio-in-r", 7],
      ["reverb-audio-out-l", "delay-audio-in-l", 8],
      ["reverb-audio-out-r", "delay-audio-in-r", 8],
      ["delay-audio-out-l", "out-in-l", 9],
      ["delay-audio-out-r", "out-in-r", 9],
    ]),
  },
  {
    id: "harmonic-phaser",
    name: "Harmonic Phaser",
    description: "Additive harmonics swept through stereo phasing and reverb.",
    cables: makeCables([
      ["harmonic-out", "spectral-phaser-audio-in-l", 0],
      ["harmonic-out", "spectral-phaser-audio-in-r", 0],
      ["lfo-out", "spectral-phaser-sweep-cv-in", 1],
      ["spectral-phaser-audio-out-l", "reverb-audio-in-l", 2],
      ["spectral-phaser-audio-out-r", "reverb-audio-in-r", 2],
      ["reverb-audio-out-l", "delay-audio-in-l", 3],
      ["reverb-audio-out-r", "delay-audio-in-r", 3],
      ["clock-out", "delay-clock-in", 4],
      ["delay-audio-out-l", "out-in-l", 5],
      ["delay-audio-out-r", "out-in-r", 5],
    ]),
  },
  {
    id: "granular-drift",
    name: "Granular Drift",
    description: "Clocked notes feed Cloudy for evolving stereo grains.",
    cables: makeCables([
      ["clock-out", "seq-clock-in", 0],
      ["seq-cv-out", "osc-voct-in", 1],
      ["seq-gate-out", "granular-trigger-cv-in", 2],
      ["osc-out", "granular-audio-in-l", 3],
      ["osc-out", "granular-audio-in-r", 3],
      ["granular-audio-out-l", "reverb-audio-in-l", 4],
      ["granular-audio-out-r", "reverb-audio-in-r", 4],
      ["reverb-audio-out-l", "out-in-l", 5],
      ["reverb-audio-out-r", "out-in-r", 5],
    ]),
  },
  {
    id: "metallic-fold",
    name: "Metallic Fold",
    description: "Noise and oscillator ring-modulated, folded, and filtered.",
    cables: makeCables([
      ["clock-out", "seq-clock-in", 0],
      ["seq-cv-out", "osc-voct-in", 1],
      ["seq-gate-out", "adsr-gate-in", 2],
      ["noise-out", "ring-audio-a-in", 3],
      ["osc-out", "ring-audio-b-in", 4],
      ["ring-audio-out", "wavefolder-audio-in", 5],
      ["wavefolder-audio-out", "filter-audio-in", 6],
      ["lfo-out", "filter-cv-in", 7],
      ["filter-audio-out", "vca-audio-in", 8],
      ["adsr-env-out", "vca-cv-in", 9],
      ["vca-out", "reverb-audio-in-l", 0],
      ["vca-out", "reverb-audio-in-r", 0],
      ["reverb-audio-out-l", "out-in-l", 1],
      ["reverb-audio-out-r", "out-in-r", 1],
    ]),
  },
  {
    id: "stereo-mixer",
    name: "Stereo Mixer",
    description: "Layer oscillator, harmonics, and noise into Cloudy and delay.",
    cables: makeCables([
      ["osc-out", "channel-1-in", 0],
      ["harmonic-saw-out", "channel-2-in", 1],
      ["noise-out", "channel-3-in", 2],
      ["channel-mixer-out-l", "granular-audio-in-l", 3],
      ["channel-mixer-out-r", "granular-audio-in-r", 3],
      ["granular-audio-out-l", "delay-audio-in-l", 4],
      ["granular-audio-out-r", "delay-audio-in-r", 4],
      ["clock-out", "delay-clock-in", 5],
      ["delay-audio-out-l", "out-in-l", 6],
      ["delay-audio-out-r", "out-in-r", 6],
    ]),
  },
  {
    id: "harmonica",
    name: "Harmonica",
    description:
      "Eight panned harmonics play an original E-minor sequence through clocked modulation and stereo effects.",
    sequence: HARMONICA_SEQUENCE,
    channelPans: [-1, -0.72, -0.43, -0.15, 0.15, 0.43, 0.72, 1],
    modulation: {
      lfoRate: 0.16,
      lfoDepth: 0.5,
      harmonicCenterCvDepth: 0.12,
      harmonicWidthCvDepth: 0.2,
      harmonicExponentialFmAmount: 0.04,
    },
    cables: makeCables([
      ["clock-out", "seq-clock-in", 0],
      ["clk-div-out", "sample-clock-in", 1],
      ["clk-div-out", "harmonic-8-level-cv-in", 1],
      ["clk-pulse-out", "granular-trigger-cv-in", 2],
      ["seq-cv-out", "harmonic-v-oct-in", 3],
      ["seq-cv-out", "sample-cv-in", 3],
      ["sample-cv-out", "harmonic-center-cv-in", 4],
      ["lfo-out", "harmonic-width-cv-in", 5],
      ["lfo-out", "spectral-phaser-sweep-cv-in", 5],
      ["lfo-out", "granular-position-cv-in", 5],
      ["harmonic-1-out", "channel-1-in", 6],
      ["harmonic-2-out", "channel-2-in", 7],
      ["harmonic-3-out", "channel-3-in", 8],
      ["harmonic-4-out", "channel-4-in", 9],
      ["harmonic-5-out", "channel-5-in", 0],
      ["harmonic-6-out", "channel-6-in", 1],
      ["harmonic-7-out", "channel-7-in", 2],
      ["harmonic-8-out", "channel-8-in", 3],
      ["channel-mixer-out-l", "spectral-phaser-audio-in-l", 4],
      ["channel-mixer-out-r", "spectral-phaser-audio-in-r", 4],
      ["spectral-phaser-audio-out-l", "granular-audio-in-l", 5],
      ["spectral-phaser-audio-out-r", "granular-audio-in-r", 5],
      ["granular-audio-out-l", "reverb-audio-in-l", 6],
      ["granular-audio-out-r", "reverb-audio-in-r", 6],
      ["reverb-audio-out-l", "delay-audio-in-l", 7],
      ["reverb-audio-out-r", "delay-audio-in-r", 7],
      ["delay-audio-out-l", "out-in-l", 8],
      ["delay-audio-out-r", "out-in-r", 8],
    ]),
  },
]
