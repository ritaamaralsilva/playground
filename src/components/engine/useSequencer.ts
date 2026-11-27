/** Owns sequence editing, clock advancement, and user preset persistence. */
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type Dispatch,
} from "react"
import { DEFAULT_PRESETS, createDefaultSequence } from "./sequencerTypes"
import type { SequencerState, Step } from "./sequencerTypes"
import {
  advanceSequence,
  outputForStep,
  type SequencerOutput,
  type StepCursor,
} from "./sequencerLogic"
import { loadUserPresets, saveUserPresets } from "./presetStorage"

export type SequencerAction =
  | {
      type: "SET_STEP_PARAM"
      index: number
      key: "note"
      value: number
    }
  | {
      type: "SET_STEP_PARAM"
      index: number
      key: "gate" | "slide"
      value: boolean
    }
  | {
      type: "SET_STEP_PARAM"
      index: number
      key: "gateLen" | "prob"
      value: number
    }
  | {
      type: "SET_STEP_PARAM"
      index: number
      key: "ratchet"
      value: Step["ratchet"]
    }
  | { type: "SET_LENGTH"; value: number }
  | { type: "SET_DIRECTION"; value: SequencerState["direction"] }
  | { type: "SET_CLOCK_DIV"; value: number }
  | { type: "SET_TRANSPOSE"; value: number }
  | { type: "SET_SCALE"; value: string }
  | { type: "SET_ROOT"; value: number }
  | { type: "LOAD_SEQUENCE"; value: SequencerState }
  | { type: "RESET" }
  | { type: "RANDOMIZE"; steps: Step[] }
  | { type: "ADVANCE"; randomIndex: number; randomGate: number }
  | { type: "GATE_OFF" }

interface SequencerRuntime {
  sequence: SequencerState
  cursor: StepCursor
  output: SequencerOutput
}

export interface SequencerController {
  sequence: SequencerState
  activeStep: number
  output: SequencerOutput
  dispatch: Dispatch<SequencerAction>
  clockTick: () => void
  gateOff: () => void
  savePreset: (name: string) => void
  loadNextPreset: () => void
  deleteLoadedPreset: () => void
  userPresets: SequencerState[]
  currentPresetName: string
  canDeleteLoadedPreset: boolean
  storageError: string | null
}

function copySequence(sequence: SequencerState): SequencerState {
  return {
    ...sequence,
    steps: sequence.steps.map((step) => ({ ...step })),
  }
}

function initialRuntime(sequence = createDefaultSequence()): SequencerRuntime {
  const initialSequence = copySequence(sequence)
  return {
    sequence: initialSequence,
    cursor: { index: 0, pingPongDirection: 1 },
    output: outputForStep(initialSequence, initialSequence.steps[0], false),
  }
}

function updateCurrentOutput(
  state: SequencerRuntime,
  sequence: SequencerState,
  gate = state.output.gate,
): SequencerRuntime {
  const step = sequence.steps[state.cursor.index]
  return {
    ...state,
    sequence,
    output: outputForStep(sequence, step, gate && step.gate),
  }
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function sequencerReducer(
  state: SequencerRuntime,
  action: SequencerAction,
): SequencerRuntime {
  switch (action.type) {
    case "SET_STEP_PARAM": {
      if (action.index < 0 || action.index >= state.sequence.steps.length)
        return state
      const steps = state.sequence.steps.map((step, index) =>
        index === action.index
          ? {
              ...step,
              [action.key]:
                action.key === "note"
                  ? Math.round(clampNumber(action.value, 36, 84))
                  : action.key === "gateLen" || action.key === "prob"
                    ? clampNumber(action.value, 0, 1)
                    : action.key === "ratchet"
                      ? Math.round(clampNumber(action.value, 1, 4))
                      : action.value,
            }
          : step,
      )
      return updateCurrentOutput(
        state,
        { ...state.sequence, steps },
      )
    }
    case "SET_LENGTH": {
      const length = Math.round(clampNumber(action.value, 1, 8))
      const cursor = { ...state.cursor, index: Math.min(state.cursor.index, length - 1) }
      const output = outputForStep(
        state.sequence,
        state.sequence.steps[cursor.index],
        false,
      )
      return {
        ...state,
        sequence: { ...state.sequence, length },
        cursor,
        output,
      }
    }
    case "SET_DIRECTION":
      return {
        ...state,
        sequence: { ...state.sequence, direction: action.value },
        cursor: { ...state.cursor, pingPongDirection: 1 },
      }
    case "SET_CLOCK_DIV":
      return {
        ...state,
        sequence: { ...state.sequence, clockDiv: action.value },
      }
    case "SET_TRANSPOSE":
      return updateCurrentOutput(state, {
        ...state.sequence,
        transpose: Math.round(clampNumber(action.value, -12, 12)),
      })
    case "SET_SCALE":
      return updateCurrentOutput(state, {
        ...state.sequence,
        scale: action.value,
      })
    case "SET_ROOT":
      return updateCurrentOutput(state, {
        ...state.sequence,
        root: Math.round(clampNumber(action.value, 0, 11)),
      })
    case "LOAD_SEQUENCE":
      return initialRuntime(action.value)
    case "RESET":
      return initialRuntime()
    case "RANDOMIZE": {
      const sequence = {
          ...state.sequence,
        steps: action.steps.map((step) => ({ ...step })),
        name: undefined,
      }
      return updateCurrentOutput(state, sequence, false)
    }
    case "ADVANCE": {
      const advanced = advanceSequence(
        state.sequence,
        state.cursor,
        action.randomIndex,
        action.randomGate,
      )
      return {
        sequence: state.sequence,
        cursor: advanced.cursor,
        output: advanced.output,
      }
    }
    case "GATE_OFF":
      return { ...state, output: { ...state.output, gate: false } }
  }
}

export function useSequencer(
  initialSequence: SequencerState = createDefaultSequence(),
  bpm = 120,
  internalClock = false,
): SequencerController {
  const [runtime, dispatch] = useReducer(
    sequencerReducer,
    initialSequence,
    initialRuntime,
  )
  const [userPresets, setUserPresets] = useState(loadUserPresets)
  const [loadedPreset, setLoadedPreset] = useState<{
    source: "user" | "built-in"
    index: number
  } | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  const hasCompletedInitialPresetLoad = useRef(false)
  const dividedTicks = useRef(0)
  const doubleTickTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!hasCompletedInitialPresetLoad.current) {
      hasCompletedInitialPresetLoad.current = true
      return
    }
    if (!saveUserPresets(userPresets)) {
      console.error("Unable to persist sequencer presets in local storage.")
    }
  }, [userPresets])

  const advance = useCallback(() => {
    dispatch({
      type: "ADVANCE",
      randomIndex: Math.random(),
      randomGate: Math.random(),
    })
  }, [])

  const clockTick = useCallback(() => {
    const clockDiv = runtime.sequence.clockDiv
    if (clockDiv === 0.5) {
      advance()
      if (doubleTickTimeout.current) clearTimeout(doubleTickTimeout.current)
      doubleTickTimeout.current = setTimeout(() => {
        doubleTickTimeout.current = null
        advance()
      }, (60_000 / Math.max(1, bpm)) / 2)
      return
    }
    dividedTicks.current += 1
    if (dividedTicks.current >= clockDiv) {
      dividedTicks.current = 0
      advance()
    }
  }, [advance, bpm, runtime.sequence.clockDiv])

  useEffect(() => {
    dividedTicks.current = 0
    if (doubleTickTimeout.current) {
      clearTimeout(doubleTickTimeout.current)
      doubleTickTimeout.current = null
    }
  }, [runtime.sequence.clockDiv])

  useEffect(() => {
    if (!internalClock) return
    const interval = setInterval(clockTick, 60_000 / Math.max(1, bpm))
    return () => clearInterval(interval)
  }, [bpm, clockTick, internalClock])

  useEffect(
    () => () => {
      if (doubleTickTimeout.current) clearTimeout(doubleTickTimeout.current)
    },
    [],
  )

  useEffect(() => {
    if (!runtime.output.gate) return
    const activeStep = runtime.sequence.steps[runtime.cursor.index]
    const gateDuration =
      (60_000 / Math.max(1, bpm)) *
      runtime.sequence.clockDiv *
      activeStep.gateLen
    const timer = setTimeout(
      () => dispatch({ type: "GATE_OFF" }),
      Math.max(10, gateDuration),
    )
    return () => clearTimeout(timer)
  }, [bpm, runtime.cursor.index, runtime.output, runtime.sequence])

  const savePreset = useCallback(
    (name: string) => {
      const normalizedName = name.trim() || `seq ${userPresets.length + 1}`
      const preset = { ...copySequence(runtime.sequence), name: normalizedName }
      const nextPresets = [...userPresets, preset]
      setUserPresets(nextPresets)
      setStorageError(
        saveUserPresets(nextPresets)
          ? null
          : "Unable to save presets in local storage.",
      )
      setLoadedPreset({ source: "user", index: userPresets.length })
    },
    [runtime.sequence, userPresets],
  )

  const loadNextPreset = useCallback(() => {
    if (loadedPreset === null && userPresets.length > 0) {
      setLoadedPreset({ source: "user", index: 0 })
      dispatch({ type: "LOAD_SEQUENCE", value: userPresets[0] })
      return
    }
    if (loadedPreset?.source === "user") {
      if (loadedPreset.index + 1 < userPresets.length) {
        const index = loadedPreset.index + 1
        setLoadedPreset({ source: "user", index })
        dispatch({ type: "LOAD_SEQUENCE", value: userPresets[index] })
      } else {
        setLoadedPreset({ source: "built-in", index: 0 })
        dispatch({ type: "LOAD_SEQUENCE", value: DEFAULT_PRESETS[0] })
      }
      return
    }
    const hasAnotherBuiltIn =
      loadedPreset !== null && loadedPreset.index + 1 < DEFAULT_PRESETS.length
    const nextIndex = hasAnotherBuiltIn ? loadedPreset.index + 1 : 0
    const nextSource =
      loadedPreset?.source === "built-in" &&
      !hasAnotherBuiltIn &&
      userPresets.length > 0
        ? "user"
        : "built-in"
    if (nextSource === "user") {
      setLoadedPreset({ source: "user", index: 0 })
      dispatch({ type: "LOAD_SEQUENCE", value: userPresets[0] })
      return
    }
    setLoadedPreset({ source: "built-in", index: nextIndex })
    dispatch({ type: "LOAD_SEQUENCE", value: DEFAULT_PRESETS[nextIndex] })
  }, [loadedPreset, userPresets])

  const deleteLoadedPreset = useCallback(() => {
    if (loadedPreset?.source !== "user") return
    const index = loadedPreset.index
    const nextPresets = userPresets.filter(
      (_, presetIndex) => presetIndex !== index,
    )
    setUserPresets(nextPresets)
    setStorageError(
      saveUserPresets(nextPresets)
        ? null
        : "Unable to save presets in local storage.",
    )
    setLoadedPreset(null)
  }, [loadedPreset, userPresets])

  const currentPresetName =
    loadedPreset?.source === "user"
      ? userPresets[loadedPreset.index]?.name ?? "User preset"
      : loadedPreset?.source === "built-in"
        ? DEFAULT_PRESETS[loadedPreset.index]?.name ?? "Built-in"
        : runtime.sequence.name ?? "Live"

  return {
    sequence: runtime.sequence,
    activeStep: runtime.cursor.index,
    output: runtime.output,
    dispatch,
    clockTick,
    gateOff: () => dispatch({ type: "GATE_OFF" }),
    savePreset,
    loadNextPreset,
    deleteLoadedPreset,
    userPresets,
    currentPresetName,
    canDeleteLoadedPreset: loadedPreset?.source === "user",
    storageError,
  }
}
