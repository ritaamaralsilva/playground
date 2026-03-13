export const CABLE_COLORS = [
  "#f5a623",
  "#e74c3c",
  "#2ecc71",
  "#3498db",
  "#9b59b6",
  "#1abc9c",
  "#e67e22",
  "#e91e8c",
  "#00bcd4",
  "#ff5722",
]

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
