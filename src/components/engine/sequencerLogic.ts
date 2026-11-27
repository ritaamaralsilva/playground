/** Provides pure sequence stepping and pitch-to-CV calculations. */
import { quantizeToScale } from "./utils"
import type { SequencerDirection, SequencerState, Step } from "./sequencerTypes"

export interface StepCursor {
  index: number
  pingPongDirection: 1 | -1
}

export interface SequencerOutput {
  cv: number
  gate: boolean
  slide: boolean
  ratchet: number
}

export interface AdvanceResult {
  cursor: StepCursor
  output: SequencerOutput
}

function boundedIndex(index: number, length: number): number {
  return Math.max(0, Math.min(length - 1, Math.floor(index)))
}

export function outputForStep(
  sequence: SequencerState,
  step: Step,
  gate: boolean,
): SequencerOutput {
  const quantized = quantizeToScale(step.note, sequence.scale, sequence.root)
  const transposed = Math.max(36, Math.min(84, quantized + sequence.transpose))
  return {
    cv: (transposed - 60) / 12,
    gate,
    slide: step.slide,
    ratchet: step.ratchet,
  }
}

export function advanceSequence(
  sequence: SequencerState,
  cursor: StepCursor,
  randomIndex: number,
  randomGate: number,
): AdvanceResult {
  const length = Math.max(1, Math.min(8, Math.floor(sequence.length)))
  const currentIndex = boundedIndex(cursor.index, length)
  let nextIndex = currentIndex
  let pingPongDirection = cursor.pingPongDirection
  const boundedRandom = Math.max(0, Math.min(0.999999999, randomIndex))

  switch (sequence.direction as SequencerDirection) {
    case "bwd":
      nextIndex = (currentIndex - 1 + length) % length
      break
    case "pingpong":
      if (length === 1) {
        nextIndex = 0
        pingPongDirection = 1
      } else {
        nextIndex = currentIndex + pingPongDirection
        if (nextIndex >= length) {
          pingPongDirection = -1
          nextIndex = length - 2
        } else if (nextIndex < 0) {
          pingPongDirection = 1
          nextIndex = 1
        }
      }
      break
    case "random":
      nextIndex = Math.floor(boundedRandom * length)
      break
    case "fwd":
    default:
      nextIndex = (currentIndex + 1) % length
      break
  }

  const step = sequence.steps[nextIndex]
  const gateChance = Math.max(0, Math.min(0.999999999, randomGate))
  return {
    cursor: { index: nextIndex, pingPongDirection },
    output: outputForStep(
      sequence,
      step,
      step.gate && gateChance < step.prob,
    ),
  }
}
