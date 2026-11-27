/** Defines clock state and pure tempo, division, swing, and tap calculations. */
export type ClockMode = "tempo" | "division" | "swing" | "pulseWidth"

export type ClockState = {
  bpm: number
  mode: ClockMode
  division: number
  swing: number
  pulseWidth: number
  running: boolean
}

export interface ClockTickOutput {
  tick: boolean
  divTick: boolean
  pulseWidth: number
  swing: number
}

export const CLOCK_DIVISIONS = [0.25, 0.5, 1, 2, 4] as const

export function createDefaultClockState(bpm = 120): ClockState {
  return {
    bpm: clampClockBpm(bpm),
    mode: "tempo",
    division: 1,
    swing: 0,
    pulseWidth: 50,
    running: true,
  }
}

export function clampClockBpm(bpm: number): number {
  return Number.isFinite(bpm) ? Math.max(30, Math.min(300, bpm)) : 120
}

export function getMasterIntervalMs(bpm: number): number {
  return 60_000 / clampClockBpm(bpm)
}

export function getSwingOffsetMs(
  subdivisionMs: number,
  swing: number,
  tickIndex: number,
): number {
  if (tickIndex % 2 === 0) return 0
  const boundedSwing = Math.max(0, Math.min(75, swing))
  return subdivisionMs * (boundedSwing / 100) * 0.5
}

export function getDivisionTickOffsetsMs(
  state: ClockState,
  masterTickIndex: number,
): number[] {
  const division = CLOCK_DIVISIONS.includes(
    state.division as (typeof CLOCK_DIVISIONS)[number],
  )
    ? state.division
    : 1
  if (division < 1) {
    const masterTicksPerOutput = Math.round(1 / division)
    return masterTickIndex % masterTicksPerOutput === 0 ? [0] : []
  }

  const pulsesPerMasterTick = Math.round(division)
  const subdivisionMs = getMasterIntervalMs(state.bpm) / pulsesPerMasterTick
  return Array.from({ length: pulsesPerMasterTick }, (_, index) =>
    index === 0
      ? 0
      : index * subdivisionMs +
        getSwingOffsetMs(subdivisionMs, state.swing, index),
  )
}

export function computeNextTickTime(
  state: ClockState,
  lastTickTimeMs: number,
  tickIndex: number,
): number {
  const division = CLOCK_DIVISIONS.includes(
    state.division as (typeof CLOCK_DIVISIONS)[number],
  )
    ? state.division
    : 1
  const intervalMs = getMasterIntervalMs(state.bpm) / division
  return (
    lastTickTimeMs +
    intervalMs +
    getSwingOffsetMs(intervalMs, state.swing, tickIndex)
  )
}

export function calculateTapTempoBpm(timestamps: number[]): number | null {
  if (timestamps.length < 2) return null
  const recentTimestamps = timestamps.slice(-4)
  const intervals = recentTimestamps
    .slice(1)
    .map((timestamp, index) => timestamp - recentTimestamps[index])
  if (intervals.some((interval) => interval <= 0)) return null
  const averageInterval =
    intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
  return clampClockBpm(60_000 / averageInterval)
}
