"use client"

import React, { useEffect, useRef } from "react"
import {
  CLOCK_DIVISIONS,
  getDivisionTickOffsetsMs,
} from "../engine/clockEngine"
import type {
  ClockMode,
  ClockState,
  ClockTickOutput,
} from "../engine/clockEngine"
import { useClock } from "../engine/useClock"
import { Knob } from "../ui/Knob"
import { DigitalDisplay } from "../ui/DigitalDisplay"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import type { PortDef } from "../engine/types"

interface ClockModuleProps {
  bpm: number
  clockBeat: boolean
  onBpmChange: (v: number) => void
  mkPort: (
    def: PortDef,
    orientation?: "horizontal" | "vertical",
  ) => React.ReactNode
  onClockStateChange?: (state: ClockState) => void
  onClockOut?: (out: ClockTickOutput) => void
  onReset?: () => void
}

const arrowStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "7px",
  fontWeight: 700,
  color: "var(--module-accent)",
  lineHeight: 1,
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: "3px",
  cursor: "pointer",
  padding: "5px 3px",
  whiteSpace: "nowrap",
}

const MODES: ClockMode[] = ["tempo", "division", "swing", "pulseWidth"]

function formatDivision(division: number): string {
  if (division < 1) return `÷${Math.round(1 / division)}`
  return `×${division}`
}

function displayValue(state: ClockState): string {
  switch (state.mode) {
    case "division":
      return formatDivision(state.division)
    case "swing":
      return `swing ${Math.round(state.swing)}%`
    case "pulseWidth":
      return `pw ${Math.round(state.pulseWidth)}%`
    case "tempo":
    default:
      return `${Math.round(state.bpm)} bpm`
  }
}

export function ClockModule({
  bpm,
  clockBeat,
  onBpmChange,
  mkPort,
  onClockStateChange,
  onClockOut,
  onReset,
}: ClockModuleProps) {
  const { state, resetVersion, dispatch, tapTempo } = useClock(bpm)
  const lastClockBeat = useRef(false)
  const masterTickIndex = useRef(0)
  const scheduledTicks = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (Math.abs(state.bpm - bpm) > 0.01) {
      dispatch({ type: "SET_BPM", value: bpm })
    }
  }, [bpm, dispatch, state.bpm])

  useEffect(() => {
    onClockStateChange?.(state)
  }, [onClockStateChange, state])

  useEffect(() => {
    masterTickIndex.current = 0
    lastClockBeat.current = false
    scheduledTicks.current.forEach((timer) => clearTimeout(timer))
    scheduledTicks.current = []
  }, [resetVersion])

  useEffect(() => {
    if (!clockBeat) {
      lastClockBeat.current = false
      return
    }
    if (lastClockBeat.current) return
    lastClockBeat.current = true
    if (!state.running) return

    masterTickIndex.current += 1
    const offsets = getDivisionTickOffsetsMs(state, masterTickIndex.current)
    const output = (tick: boolean, divTick: boolean) =>
      onClockOut?.({
        tick,
        divTick,
        pulseWidth: state.pulseWidth,
        swing: state.swing,
      })
    output(true, offsets.includes(0))

    offsets.forEach((offset) => {
      if (offset <= 0) return
      const timer = setTimeout(() => {
        scheduledTicks.current = scheduledTicks.current.filter(
          (scheduled) => scheduled !== timer,
        )
        output(false, true)
      }, offset)
      scheduledTicks.current.push(timer)
    })
  }, [clockBeat, onClockOut, state])

  useEffect(
    () => () => {
      scheduledTicks.current.forEach((timer) => clearTimeout(timer))
      scheduledTicks.current = []
    },
    [],
  )

  useEffect(() => {
    if (state.running) return
    scheduledTicks.current.forEach((timer) => clearTimeout(timer))
    scheduledTicks.current = []
  }, [state.running])

  const knobRange =
    state.mode === "tempo"
      ? { min: 30, max: 300, value: state.bpm }
      : state.mode === "division"
        ? {
            min: 0,
            max: CLOCK_DIVISIONS.length - 1,
            value: CLOCK_DIVISIONS.indexOf(
              state.division as (typeof CLOCK_DIVISIONS)[number],
            ),
          }
        : state.mode === "swing"
          ? { min: 0, max: 75, value: state.swing }
          : { min: 5, max: 95, value: state.pulseWidth }

  const updateKnob = (value: number) => {
    switch (state.mode) {
      case "division":
        dispatch({
          type: "SET_DIVISION",
          value: CLOCK_DIVISIONS[Math.round(value)],
        })
        break
      case "swing":
        dispatch({ type: "SET_SWING", value })
        break
      case "pulseWidth":
        dispatch({ type: "SET_PULSE_WIDTH", value })
        break
      case "tempo":
      default:
        dispatch({ type: "SET_BPM", value })
        onBpmChange(value)
        break
    }
  }

  const modeIndex = MODES.indexOf(state.mode)
  const nextMode = MODES[(modeIndex + 1) % MODES.length]
  const handleTap = () => {
    const tappedBpm = tapTempo()
    if (tappedBpm !== null) onBpmChange(tappedBpm)
  }

  return (
    <ModuleFrontPanel title="clock" width={110} tone="clock">
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "7px",
          padding: "0 4px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
          }}
        >
          <DigitalDisplay value={displayValue(state)} width={78} />
          <span
            aria-label={state.running ? "Clock running" : "Clock stopped"}
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background:
                clockBeat && state.running
                  ? "var(--module-accent)"
                  : "color-mix(in srgb, var(--module-accent) 16%, var(--surface))",
              boxShadow:
                clockBeat && state.running
                  ? "0 0 7px color-mix(in srgb, var(--module-accent) 45%, transparent)"
                  : "none",
              flexShrink: 0,
            }}
          />
        </div>

        <Knob
          value={knobRange.value}
          min={knobRange.min}
          max={knobRange.max}
          label="clock"
          sublabel={state.mode === "pulseWidth" ? "pulse" : state.mode}
          size={26}
          compact
          onChange={updateKnob}
        />

        <div
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "4px",
            justifyItems: "stretch",
          }}
        >
          <button
            type="button"
            onClick={() => dispatch({ type: "TOGGLE_RUN" })}
            style={{
              ...arrowStyle,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "3px",
              color: state.running ? "var(--module-accent)" : "var(--muted)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: state.running ? "var(--module-accent)" : "var(--line)",
              }}
            />
            {state.running ? "STOP" : "RUN"}
          </button>
          <button
            type="button"
            onClick={() => {
              dispatch({ type: "RESET" })
              onReset?.()
            }}
            style={arrowStyle}
          >
            RESET
          </button>
          <button
            type="button"
            onClick={handleTap}
            style={arrowStyle}
          >
            TAP
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_MODE", value: nextMode })}
            style={arrowStyle}
          >
            MODE
          </button>
        </div>
      </div>

      <PortSection
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          justifyItems: "center",
          alignItems: "center",
          gap: "4px 2px",
          padding: "5px 3px",
          marginBottom: "7px",
        }}
      >
        {mkPort(
          { id: "clock-out", label: "OUT", type: "output" },
          "vertical",
        )}
        {mkPort(
          { id: "clk-div-out", label: "DIV", type: "output" },
          "vertical",
        )}
        {mkPort(
          { id: "clk-pulse-out", label: "PULSE", type: "output" },
          "vertical",
        )}
        {mkPort({ id: "clk-in", label: "IN", type: "input" }, "vertical")}
      </PortSection>
    </ModuleFrontPanel>
  )
}
