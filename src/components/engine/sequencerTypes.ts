/** Defines sequencer state, default steps, and built-in read-only presets. */
export type Step = {
  note: number
  gate: boolean
  gateLen: number
  prob: number
  ratchet: 1 | 2 | 3 | 4
  slide: boolean
}

export type SequencerDirection = "fwd" | "bwd" | "pingpong" | "random"

export type SequencerState = {
  steps: Step[]
  length: number
  direction: SequencerDirection
  clockDiv: number
  transpose: number
  scale: string
  root: number
  name?: string
}

export type SongEntry = {
  id: number
  name: string
  sequence: SequencerState
  repeats: number
}

function createStep(
  note: number,
  overrides: Partial<Step> = {},
): Step {
  return {
    note,
    gate: true,
    gateLen: 0.75,
    prob: 1,
    ratchet: 1,
    slide: false,
    ...overrides,
  }
}

export function createDefaultSequence(): SequencerState {
  return {
    steps: [48, 52, 55, 60, 63, 60, 55, 52].map((note) => createStep(note)),
    length: 8,
    direction: "fwd",
    clockDiv: 1,
    transpose: 0,
    scale: "minor",
    root: 0,
    name: "seq 1",
  }
}

export const DEFAULT_PRESETS: readonly SequencerState[] = [
  {
    name: "Arpeggio",
    steps: [60, 64, 67, 72, 76, 72, 67, 64].map((note) => createStep(note)),
    length: 8,
    direction: "fwd",
    clockDiv: 1,
    transpose: 0,
    scale: "major",
    root: 0,
  },
  {
    name: "Probability",
    steps: [
      createStep(48, { prob: 1 }),
      createStep(55, { prob: 0.65 }),
      createStep(60, { prob: 0.35 }),
      createStep(64, { prob: 0.8 }),
      createStep(67, { prob: 0.5 }),
      createStep(64, { prob: 0.7 }),
      createStep(60, { prob: 0.4 }),
      createStep(55, { prob: 0.9 }),
    ],
    length: 8,
    direction: "fwd",
    clockDiv: 1,
    transpose: 0,
    scale: "minor",
    root: 0,
  },
  {
    name: "Ratchet",
    steps: [
      createStep(48, { ratchet: 1 }),
      createStep(55, { ratchet: 2 }),
      createStep(60, { ratchet: 3 }),
      createStep(64, { ratchet: 4, slide: true }),
      createStep(67, { ratchet: 2 }),
      createStep(64, { ratchet: 3 }),
      createStep(60, { ratchet: 1, slide: true }),
      createStep(55, { ratchet: 4 }),
    ],
    length: 8,
    direction: "pingpong",
    clockDiv: 1,
    transpose: 0,
    scale: "pentatonic",
    root: 0,
  },
]
