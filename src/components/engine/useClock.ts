/** Provides reducer-managed clock settings and four-tap tempo measurement. */
import { useCallback, useReducer, useRef } from "react"
import {
  CLOCK_DIVISIONS,
  calculateTapTempoBpm,
  clampClockBpm,
  createDefaultClockState,
  type ClockMode,
  type ClockState,
} from "./clockEngine"

export type ClockAction =
  | { type: "SET_BPM"; value: number }
  | { type: "SET_MODE"; value: ClockMode }
  | { type: "SET_DIVISION"; value: number }
  | { type: "SET_SWING"; value: number }
  | { type: "SET_PULSE_WIDTH"; value: number }
  | { type: "TOGGLE_RUN" }
  | { type: "RESET" }
  | { type: "TAP_TEMPO"; timestamps: number[] }

interface ClockRuntime {
  state: ClockState
  resetVersion: number
}

function clockReducer(
  runtime: ClockRuntime,
  action: ClockAction,
): ClockRuntime {
  const state = runtime.state
  switch (action.type) {
    case "SET_BPM":
      return {
        ...runtime,
        state: { ...state, bpm: clampClockBpm(action.value) },
      }
    case "SET_MODE":
      return { ...runtime, state: { ...state, mode: action.value } }
    case "SET_DIVISION":
      return {
        ...runtime,
        state: {
          ...state,
          division: CLOCK_DIVISIONS.reduce((nearest, division) =>
            Math.abs(division - action.value) <
            Math.abs(nearest - action.value)
              ? division
              : nearest,
          ),
        },
      }
    case "SET_SWING":
      return {
        ...runtime,
        state: { ...state, swing: Math.max(0, Math.min(75, action.value)) },
      }
    case "SET_PULSE_WIDTH":
      return {
        ...runtime,
        state: {
          ...state,
          pulseWidth: Math.max(5, Math.min(95, action.value)),
        },
      }
    case "TOGGLE_RUN":
      return {
        ...runtime,
        state: { ...state, running: !state.running },
      }
    case "RESET":
      return { ...runtime, resetVersion: runtime.resetVersion + 1 }
    case "TAP_TEMPO": {
      const bpm = calculateTapTempoBpm(action.timestamps)
      return bpm === null
        ? runtime
        : { ...runtime, state: { ...state, bpm } }
    }
  }
}

export function useClock(initialBpm = 120) {
  const [runtime, dispatch] = useReducer(
    clockReducer,
    initialBpm,
    (bpm): ClockRuntime => ({
      state: createDefaultClockState(bpm),
      resetVersion: 0,
    }),
  )
  const tapTimestamps = useRef<number[]>([])

  const tapTempo = useCallback((timestamp = Date.now()) => {
    const previous = tapTimestamps.current[tapTimestamps.current.length - 1]
    if (
      previous === undefined ||
      timestamp <= previous ||
      timestamp - previous > 2_000
    ) {
      tapTimestamps.current = [timestamp]
    } else {
      tapTimestamps.current = [...tapTimestamps.current.slice(-3), timestamp]
    }
    const bpm = calculateTapTempoBpm(tapTimestamps.current)
    dispatch({
      type: "TAP_TEMPO",
      timestamps: tapTimestamps.current,
    })
    return bpm
  }, [])

  return {
    state: runtime.state,
    resetVersion: runtime.resetVersion,
    dispatch,
    tapTempo,
  }
}
