/** Loads and saves validated user sequencer presets in localStorage. */
import { SCALE_NAMES } from "./constants"
import type {
  SequencerDirection,
  SequencerState,
  Step,
} from "./sequencerTypes"

const STORAGE_KEY = "seq-user-presets-v1"
const DIRECTIONS: readonly SequencerDirection[] = [
  "fwd",
  "bwd",
  "pingpong",
  "random",
]
const CLOCK_DIVISIONS = [0.5, 1, 2, 4]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function boundedNumber(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  return Math.max(min, Math.min(max, value))
}

function normalizeStep(value: unknown): Step | null {
  if (!isRecord(value)) return null
  const note = boundedNumber(value.note, 36, 84)
  const gateLen = boundedNumber(value.gateLen, 0, 1)
  const prob = boundedNumber(value.prob, 0, 1)
  const ratchet = boundedNumber(value.ratchet, 1, 4)
  if (
    note === null ||
    gateLen === null ||
    prob === null ||
    ratchet === null ||
    typeof value.gate !== "boolean" ||
    typeof value.slide !== "boolean"
  ) {
    return null
  }
  return {
    note: Math.round(note),
    gate: value.gate,
    gateLen,
    prob,
    ratchet: Math.round(ratchet) as Step["ratchet"],
    slide: value.slide,
  }
}

function normalizePreset(value: unknown): SequencerState | null {
  if (!isRecord(value) || !Array.isArray(value.steps) || value.steps.length !== 8)
    return null
  const steps = value.steps.map(normalizeStep)
  const length = boundedNumber(value.length, 1, 8)
  const transpose = boundedNumber(value.transpose, -12, 12)
  const root = boundedNumber(value.root, 0, 11)
  const clockDiv = boundedNumber(value.clockDiv, 0.5, 4)
  if (
    steps.some((step) => step === null) ||
    length === null ||
    transpose === null ||
    root === null ||
    clockDiv === null ||
    typeof value.direction !== "string" ||
    !DIRECTIONS.includes(value.direction as SequencerDirection) ||
    typeof value.scale !== "string" ||
    !SCALE_NAMES.includes(value.scale) ||
    (value.name !== undefined && typeof value.name !== "string")
  ) {
    return null
  }
  const nearestClockDiv = CLOCK_DIVISIONS.reduce((nearest, candidate) =>
    Math.abs(candidate - clockDiv) < Math.abs(nearest - clockDiv)
      ? candidate
      : nearest,
  )
  const preset: SequencerState = {
    steps: steps.filter((step): step is Step => step !== null),
    length: Math.round(length),
    direction: value.direction as SequencerDirection,
    clockDiv: nearestClockDiv,
    transpose: Math.round(transpose),
    scale: value.scale,
    root: Math.round(root),
  }
  if (typeof value.name === "string" && value.name.trim()) {
    preset.name = value.name.trim()
  }
  return preset
}

export function loadUserPresets(): SequencerState[] {
  if (typeof window === "undefined") return []
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === null) return []
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    const presets = parsed.map(normalizePreset)
    return presets.some((preset) => preset === null)
      ? []
      : (presets as SequencerState[])
  } catch {
    return []
  }
}

export function saveUserPresets(presets: SequencerState[]): boolean {
  if (typeof window === "undefined") return false
  try {
    const normalized = presets.map(normalizePreset)
    if (normalized.some((preset) => preset === null)) return false
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    return true
  } catch {
    return false
  }
}
