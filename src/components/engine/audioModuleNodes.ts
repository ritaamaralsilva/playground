import type { NoiseColor } from "./types"

export function createNoiseBuffer(
  audioContext: AudioContext,
  color: NoiseColor,
  duration = 2,
): AudioBuffer {
  const length = Math.floor(audioContext.sampleRate * duration)
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate)
  const samples = buffer.getChannelData(0)
  let b0 = 0
  let b1 = 0
  let b2 = 0
  let b3 = 0
  let b4 = 0
  let b5 = 0
  let b6 = 0
  let brown = 0
  let energy = 0

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    let sample = white

    if (color === "pink") {
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      b6 = white * 0.115926
      sample = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    } else if (color === "brown") {
      brown = (brown + white * 0.02) / 1.02
      sample = brown * 3.5
    }

    samples[i] = sample
    energy += sample * sample
  }

  const rms = Math.sqrt(energy / length)
  const normalization = rms > 0 ? 0.2 / rms : 1
  for (let i = 0; i < length; i++) samples[i] *= normalization

  return buffer
}

export function wavefolderTransfer(
  input: number,
  fold: number,
  bias: number,
): number {
  const foldAmount = Math.max(0.25, Math.min(4, fold))
  const biasAmount = Math.max(-1, Math.min(1, bias))
  return (
    Math.asin(Math.sin((input * foldAmount + biasAmount) * (Math.PI / 2))) /
    (Math.PI / 2)
  )
}

export function createWavefolderCurve(
  fold: number,
  bias = 0,
): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(2048)

  for (let i = 0; i < curve.length; i++) {
    const input = (i / (curve.length - 1)) * 2 - 1
    curve[i] = wavefolderTransfer(input, fold, bias)
  }

  return curve
}
