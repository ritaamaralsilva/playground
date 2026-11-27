"use client"

import React, { useEffect, useRef, useState } from "react"
import { Knob } from "../ui/Knob"
import { DigitalDisplay } from "../ui/DigitalDisplay"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import { SCALE_NAMES, ROOT_NOTES } from "../engine/constants"
import { midiName, quantizeToScale } from "../engine/utils"
import type { PortDef } from "../engine/types"
import type { SequencerController } from "../engine/useSequencer"
import { useSequencer } from "../engine/useSequencer"
import type { SequencerState, Step } from "../engine/sequencerTypes"

type StepMode = "pitch" | "gate" | "prob" | "ratchet" | "slide"

interface SequencerModuleProps {
  seqStep?: number
  seqNotes: number[]
  scaleIdx: number
  rootIdx: number
  onScaleChange: (i: number) => void
  onRootChange: (i: number) => void
  onNoteChange: (i: number, v: number) => void
  mkPort: (def: PortDef) => React.ReactNode
  sequencer?: SequencerController
  onStepOut?: (out: {
    cv: number
    gate: boolean
    slide: boolean
    ratchet: number
  }) => void
}

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "8px",
  color: "var(--muted)",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  lineHeight: 1,
}

const arrowStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "10px",
  color: "var(--module-accent)",
  lineHeight: 1,
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "0 4px",
}

const controlGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
  minWidth: 0,
}

const buttonStyle: React.CSSProperties = {
  ...arrowStyle,
  border: "1px solid var(--line)",
  borderRadius: "3px",
  padding: "4px 7px",
  whiteSpace: "nowrap",
}

const MODES: StepMode[] = ["pitch", "gate", "prob", "ratchet", "slide"]
const CLOCK_DIVISIONS = [0.5, 1, 2, 4]

function formatClockDiv(value: number): string {
  return value === 0.5 ? "×2" : `÷${value}`
}

function randomSteps(): Step[] {
  return Array.from({ length: 8 }, () => ({
    note: 36 + Math.floor(Math.random() * 49),
    gate: Math.random() > 0.12,
    gateLen: 0.2 + Math.random() * 0.75,
    prob: 0.35 + Math.random() * 0.65,
    ratchet: (1 + Math.floor(Math.random() * 4)) as Step["ratchet"],
    slide: Math.random() > 0.8,
  }))
}

export function SequencerModule({
  seqStep,
  seqNotes,
  scaleIdx,
  rootIdx,
  onScaleChange,
  onRootChange,
  onNoteChange,
  mkPort,
  sequencer,
  onStepOut,
}: SequencerModuleProps) {
  const localSequencer = useSequencer(undefined, 120, seqStep === undefined)
  const activeSequencer = sequencer ?? localSequencer
  const sequence: SequencerState = sequencer
    ? sequencer.sequence
    : {
        ...localSequencer.sequence,
        steps: localSequencer.sequence.steps.map((step, index) => ({
          ...step,
          note: seqNotes[index] ?? step.note,
        })),
        scale: SCALE_NAMES[scaleIdx] ?? localSequencer.sequence.scale,
        root: rootIdx,
      }
  const [mode, setMode] = useState<StepMode>("pitch")
  const [presetName, setPresetName] = useState("seq 1")
  const longPressTimers = useRef(
    new Map<number, ReturnType<typeof setTimeout>>(),
  )
  const activeStep = Math.max(
    0,
    Math.min(sequence.length - 1, seqStep ?? activeSequencer.activeStep),
  )

  useEffect(() => {
    onStepOut?.(activeSequencer.output)
  }, [activeSequencer.output, onStepOut])

  useEffect(
    () => () => {
      longPressTimers.current.forEach((timer) => clearTimeout(timer))
      longPressTimers.current.clear()
    },
    [],
  )

  const dispatchStepParam = (
    index: number,
    key: keyof Step,
    value: number | boolean,
  ) => {
    if (key === "note" && typeof value === "number") {
      if (!sequencer) {
        localSequencer.dispatch({
          type: "SET_STEP_PARAM",
          index,
          key: "note",
          value,
        })
      }
      onNoteChange(index, Math.round(value))
    } else if (key === "gate" && typeof value === "boolean") {
      activeSequencer.dispatch({ type: "SET_STEP_PARAM", index, key, value })
    } else if (key === "slide" && typeof value === "boolean") {
      activeSequencer.dispatch({ type: "SET_STEP_PARAM", index, key, value })
    } else if (
      (key === "gateLen" || key === "prob") &&
      typeof value === "number"
    ) {
      activeSequencer.dispatch({ type: "SET_STEP_PARAM", index, key, value })
    } else if (key === "ratchet" && typeof value === "number") {
      const ratchet = Math.max(1, Math.min(4, Math.round(value))) as Step["ratchet"]
      activeSequencer.dispatch({
        type: "SET_STEP_PARAM",
        index,
        key: "ratchet",
        value: ratchet,
      })
    }
  }

  const updateScale = (index: number) => {
    if (!sequencer) {
      localSequencer.dispatch({
        type: "SET_SCALE",
        value: SCALE_NAMES[index],
      })
    }
    onScaleChange(index)
  }

  const updateRoot = (index: number) => {
    if (!sequencer) {
      localSequencer.dispatch({ type: "SET_ROOT", value: index })
    }
    onRootChange(index)
  }

  const setStepLongPress = (index: number) => {
    const timer = setTimeout(() => {
      longPressTimers.current.delete(index)
      dispatchStepParam(index, "gate", !sequence.steps[index].gate)
    }, 400)
    longPressTimers.current.set(index, timer)
  }

  const clearStepLongPress = (index: number) => {
    const timer = longPressTimers.current.get(index)
    if (timer) clearTimeout(timer)
    longPressTimers.current.delete(index)
  }

  const stepKnobValue = (step: Step): number => {
    switch (mode) {
      case "gate":
        return step.gateLen
      case "prob":
        return step.prob
      case "ratchet":
        return step.ratchet
      case "slide":
        return step.slide ? 1 : 0
      case "pitch":
      default:
        return step.note
    }
  }

  const stepSublabel = (step: Step): string => {
    switch (mode) {
      case "gate":
        return `${Math.round(step.gateLen * 100)}%`
      case "prob":
        return `${Math.round(step.prob * 100)}%`
      case "ratchet":
        return `${step.ratchet}×`
      case "slide":
        return step.slide ? "on" : "off"
      case "pitch":
      default:
        return midiName(
          quantizeToScale(step.note, sequence.scale, sequence.root),
        )
    }
  }

  const onKnobChange = (index: number, value: number) => {
    switch (mode) {
      case "gate":
        dispatchStepParam(index, "gateLen", value)
        break
      case "prob":
        dispatchStepParam(index, "prob", value)
        break
      case "ratchet":
        dispatchStepParam(index, "ratchet", value)
        break
      case "slide":
        dispatchStepParam(index, "slide", value >= 0.5)
        break
      case "pitch":
        dispatchStepParam(index, "note", value)
        break
    }
  }

  const saveCurrentPreset = () => {
    activeSequencer.savePreset(presetName)
    setPresetName(`seq ${activeSequencer.userPresets.length + 2}`)
  }

  const stepRow = sequence.steps.map((step, index) => {
    const knobRange =
      mode === "pitch"
        ? { min: 36, max: 84 }
        : mode === "ratchet"
          ? { min: 1, max: 4 }
          : { min: 0, max: 1 }
    return (
      <div
        key={index}
        style={{
          width: 24,
          flex: "0 0 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "3px",
        }}
      >
        <button
          type="button"
          aria-label={`Step ${index + 1}; long press to toggle gate`}
          onPointerDown={(event) => {
            event.preventDefault()
            setStepLongPress(index)
          }}
          onPointerUp={() => clearStepLongPress(index)}
          onPointerLeave={() => clearStepLongPress(index)}
          onPointerCancel={() => clearStepLongPress(index)}
          style={{
            width: 9,
            height: 9,
            padding: 0,
            borderRadius: "50%",
            cursor: "pointer",
            background:
              activeStep === index
                ? "var(--module-accent)"
                : step.gate
                  ? "color-mix(in srgb, var(--module-accent) 42%, var(--surface))"
                  : "var(--surface)",
            boxShadow:
              activeStep === index
                ? "0 0 7px color-mix(in srgb, var(--module-accent) 50%, transparent)"
                : "none",
            border:
              activeStep === index
                ? "1px solid var(--module-accent)"
                : "1px solid var(--line)",
          }}
        />
        <Knob
          value={stepKnobValue(step)}
          min={knobRange.min}
          max={knobRange.max}
          label={`${index + 1}`}
          sublabel={stepSublabel(step)}
          size={24}
          compact
          onChange={(value) => onKnobChange(index, value)}
        />
      </div>
    )
  })

  return (
    <ModuleFrontPanel title="8 STEP SEQUENCER" width={270} tone="sequencer">
      <div
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "0 12px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            paddingTop: "3px",
          }}
        >
          <div style={controlGroupStyle}>
            <span style={labelStyle}>scale</span>
            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
              <button
                type="button"
                aria-label="Previous scale"
                onClick={() =>
                  updateScale(
                    (scaleIdx - 1 + SCALE_NAMES.length) % SCALE_NAMES.length,
                  )
                }
                style={arrowStyle}
              >
                ◀
              </button>
              <DigitalDisplay
                value={SCALE_NAMES[scaleIdx] ?? sequence.scale}
                width={72}
              />
              <button
                type="button"
                aria-label="Next scale"
                onClick={() =>
                  updateScale((scaleIdx + 1) % SCALE_NAMES.length)
                }
                style={arrowStyle}
              >
                ▶
              </button>
            </div>
          </div>
          <div style={controlGroupStyle}>
            <span style={labelStyle}>root</span>
            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
              <button
                type="button"
                aria-label="Previous root"
                onClick={() => updateRoot((rootIdx - 1 + 12) % 12)}
                style={arrowStyle}
              >
                ◀
              </button>
              <DigitalDisplay
                value={ROOT_NOTES[rootIdx] ?? "C"}
                width={30}
              />
              <button
                type="button"
                aria-label="Next root"
                onClick={() => updateRoot((rootIdx + 1) % 12)}
                style={arrowStyle}
              >
                ▶
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span style={labelStyle}>mode</span>
          <button
            type="button"
            onClick={() =>
              setMode((current) => MODES[(MODES.indexOf(current) + 1) % MODES.length])
            }
            style={buttonStyle}
            aria-label={`Step mode: ${mode}. Click to change`}
          >
            {mode} ↻
          </button>
          <span style={{ ...labelStyle, letterSpacing: "0.04em" }}>
            hold LED = gate
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "4px",
            width: "100%",
          }}
        >
          {stepRow}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px 12px",
            justifyItems: "center",
          }}
        >
          <div style={controlGroupStyle}>
            <span style={labelStyle}>length</span>
            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
              <button
                type="button"
                aria-label="Decrease sequence length"
                onClick={() =>
                  activeSequencer.dispatch({
                    type: "SET_LENGTH",
                    value: sequence.length - 1,
                  })
                }
                style={arrowStyle}
              >
                ◀
              </button>
              <DigitalDisplay value={`${sequence.length}`} width={28} />
              <button
                type="button"
                aria-label="Increase sequence length"
                onClick={() =>
                  activeSequencer.dispatch({
                    type: "SET_LENGTH",
                    value: sequence.length + 1,
                  })
                }
                style={arrowStyle}
              >
                ▶
              </button>
            </div>
          </div>
          <div style={controlGroupStyle}>
            <span style={labelStyle}>transpose</span>
            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
              <button
                type="button"
                aria-label="Decrease transpose"
                onClick={() =>
                  activeSequencer.dispatch({
                    type: "SET_TRANSPOSE",
                    value: sequence.transpose - 1,
                  })
                }
                style={arrowStyle}
              >
                ◀
              </button>
              <DigitalDisplay
                value={`${sequence.transpose > 0 ? "+" : ""}${sequence.transpose}`}
                width={36}
              />
              <button
                type="button"
                aria-label="Increase transpose"
                onClick={() =>
                  activeSequencer.dispatch({
                    type: "SET_TRANSPOSE",
                    value: sequence.transpose + 1,
                  })
                }
                style={arrowStyle}
              >
                ▶
              </button>
            </div>
          </div>
          <div style={controlGroupStyle}>
            <span style={labelStyle}>direction</span>
            <button
              type="button"
              onClick={() => {
                const directions: SequencerState["direction"][] = [
                  "fwd",
                  "bwd",
                  "pingpong",
                  "random",
                ]
                const current = directions.indexOf(sequence.direction)
                activeSequencer.dispatch({
                  type: "SET_DIRECTION",
                  value: directions[(current + 1) % directions.length],
                })
              }}
              style={buttonStyle}
            >
              {sequence.direction}
            </button>
          </div>
          <div style={controlGroupStyle}>
            <span style={labelStyle}>clock</span>
            <button
              type="button"
              onClick={() => {
                const current = CLOCK_DIVISIONS.indexOf(sequence.clockDiv)
                activeSequencer.dispatch({
                  type: "SET_CLOCK_DIV",
                  value: CLOCK_DIVISIONS[(current + 1) % CLOCK_DIVISIONS.length],
                })
              }}
              style={buttonStyle}
            >
              {formatClockDiv(sequence.clockDiv)}
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <button
            type="button"
            onClick={() =>
              activeSequencer.dispatch({
                type: "RANDOMIZE",
                steps: randomSteps(),
              })
            }
            style={buttonStyle}
          >
            RANDOMIZE
          </button>
          <button
            type="button"
            onClick={() => activeSequencer.dispatch({ type: "RESET" })}
            style={buttonStyle}
          >
            RESET
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
        >
          <input
            aria-label="Preset name"
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            style={{
              width: 76,
              minWidth: 0,
              boxSizing: "border-box",
              padding: "4px 5px",
              border: "1px solid var(--line)",
              borderRadius: 3,
              background: "var(--surface)",
              color: "var(--muted)",
              fontFamily: "var(--font-sans)",
              fontSize: 9,
            }}
          />
          <button
            type="button"
            onClick={saveCurrentPreset}
            style={buttonStyle}
          >
            SAVE
          </button>
          <button
            type="button"
            onClick={activeSequencer.loadNextPreset}
            style={buttonStyle}
          >
            LOAD
          </button>
          <button
            type="button"
            onClick={activeSequencer.deleteLoadedPreset}
            disabled={!activeSequencer.canDeleteLoadedPreset}
            style={{
              ...buttonStyle,
              opacity: activeSequencer.canDeleteLoadedPreset ? 1 : 0.45,
              cursor: activeSequencer.canDeleteLoadedPreset
                ? "pointer"
                : "default",
            }}
          >
            DEL
          </button>
        </div>
        <div
          style={{
            textAlign: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 8,
            color: activeSequencer.storageError ? "#c65b62" : "var(--muted)",
            minHeight: 9,
          }}
          aria-live="polite"
        >
          {activeSequencer.storageError ??
            `${activeSequencer.currentPresetName}${activeSequencer.canDeleteLoadedPreset ? " · user" : ""}`}
        </div>
      </div>

      <PortSection
        style={{
          flexDirection: "row",
          justifyContent: "center",
          gap: "12px",
          padding: "4px 7px",
          marginBottom: "7px",
        }}
      >
        {mkPort({ id: "seq-clock-in", label: "clk in", type: "input" })}
        {mkPort({ id: "seq-cv-out", label: "cv out", type: "output" })}
        {mkPort({ id: "seq-gate-out", label: "gate out", type: "output" })}
      </PortSection>
    </ModuleFrontPanel>
  )
}
