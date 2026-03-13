import { SCALES } from "./constants"

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function quantizeToScale(
  raw: number,
  scaleName: string,
  rootNote: number
): number {
  const intervals = SCALES[scaleName] ?? SCALES["chromatic"]
  const octave = Math.floor(raw / 12)
  const semitone = raw % 12
  const adjusted = (semitone - rootNote + 12) % 12
  let closest = intervals[0]
  let minDist = 12
  for (const iv of intervals) {
    const d = Math.abs(iv - adjusted)
    if (d < minDist) {
      minDist = d
      closest = iv
    }
  }
  return octave * 12 + rootNote + closest
}

export function midiName(midi: number): string {
  const names = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ]
  return names[midi % 12] + Math.floor(midi / 12 - 1)
}
