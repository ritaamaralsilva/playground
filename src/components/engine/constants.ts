export const CABLE_COLORS = [
  "#568fd0",
  "#d95d8c",
  "#319e79",
  "#637be0",
  "#258e93",
  "#9770d4",
  "#d67c56",
  "#a35bc0",
  "#b78a24",
  "#ca4d7b",
]

export const WAVEFORM_COLOR = "#ca4d7b"

export const WAVEFORMS: OscillatorType[] = [
  "sine",
  "sawtooth",
  "square",
  "triangle",
]

export const SCALES: Record<string, number[]> = {
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolyd: [0, 2, 4, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
}

export const SCALE_NAMES = Object.keys(SCALES)

export const ROOT_NOTES = [
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
