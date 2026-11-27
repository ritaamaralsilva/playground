import React from "react"
import { Knob } from "../ui/Knob"
import { ModuleFrontPanel } from "../ui/ModuleFrontPanel"
import type { PortDef, ReverbMode } from "../engine/types"

interface ReverbModuleProps {
  reverbSize: number
  reverbMix: number
  reverbPreDelay: number
  reverbCharacter: number
  reverbMode: ReverbMode
  reverbReverse: boolean
  onSizeChange: (v: number) => void
  onMixChange: (v: number) => void
  onPreDelayChange: (v: number) => void
  onCharacterChange: (v: number) => void
  onModeChange: (mode: ReverbMode) => void
  onReverseToggle: () => void
  mkPort: (
    def: PortDef,
    orientation?: "horizontal" | "vertical",
  ) => React.ReactNode
}

const REVERB_MODES: { value: ReverbMode; label: string }[] = [
  { value: "room", label: "Room" },
  { value: "hall", label: "Hall" },
  { value: "plate", label: "Plate" },
  { value: "spring", label: "Spring" },
  { value: "convolution", label: "Convolution" },
]

const CHARACTER_LABELS: Record<ReverbMode, string> = {
  room: "early",
  hall: "width",
  plate: "tone",
  spring: "tension",
  convolution: "color",
}

function isReverbMode(value: string): value is ReverbMode {
  return REVERB_MODES.some((mode) => mode.value === value)
}

export function ReverbModule({
  reverbSize,
  reverbMix,
  reverbPreDelay,
  reverbCharacter,
  reverbMode,
  reverbReverse,
  onSizeChange,
  onMixChange,
  onPreDelayChange,
  onCharacterChange,
  onModeChange,
  onReverseToggle,
  mkPort,
}: ReverbModuleProps) {
  return (
    <ModuleFrontPanel title="reverb" width={110} tone="reverb">
      <label
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          width: "100%",
          color: "var(--ink)",
          fontSize: 8,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        mode
        <select
          aria-label="Reverb mode"
          value={reverbMode}
          onChange={(event) => {
            if (isReverbMode(event.target.value))
              onModeChange(event.target.value)
          }}
          style={{
            width: "100%",
            height: 24,
            padding: "2px 4px",
            border: "1px solid var(--line)",
            borderRadius: 4,
            background: "var(--surface-raised)",
            color: "var(--ink)",
            fontSize: 9,
            letterSpacing: "normal",
            textTransform: "none",
          }}
        >
          {REVERB_MODES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 8,
          width: "100%",
          justifyItems: "center",
        }}
      >
        <Knob
          value={reverbSize}
          min={0.01}
          max={1}
          label="decay"
          sublabel={`${(0.5 + reverbSize * 3.5).toFixed(1)}s`}
          size={22}
          onChange={onSizeChange}
        />
        <Knob
          value={reverbPreDelay}
          min={0}
          max={0.25}
          label="pre-delay"
          sublabel={`${Math.round(reverbPreDelay * 1000)}ms`}
          size={22}
          onChange={onPreDelayChange}
        />
        <Knob
          value={reverbCharacter}
          min={0}
          max={1}
          label={CHARACTER_LABELS[reverbMode]}
          sublabel={reverbCharacter.toFixed(2)}
          size={22}
          onChange={onCharacterChange}
        />
        <Knob
          value={reverbMix}
          min={0}
          max={1}
          label="mix"
          sublabel={reverbMix.toFixed(2)}
          size={22}
          onChange={onMixChange}
        />
      </div>
      <button
        type="button"
        aria-pressed={reverbReverse}
        onClick={onReverseToggle}
        style={{
          minHeight: 24,
          width: "100%",
          marginTop: 6,
          padding: "3px 4px",
          border: reverbReverse
            ? "1px solid var(--module-accent)"
            : "1px solid var(--line)",
          borderRadius: 4,
          background: reverbReverse
            ? "color-mix(in srgb, var(--module-accent) 24%, var(--surface))"
            : "var(--surface-raised)",
          color: "var(--ink)",
          cursor: "pointer",
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {reverbReverse ? "reverse on" : "reverse off"}
      </button>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          width: "100%",
          marginTop: "auto",
          marginBottom: 8,
        }}
      >
        <div
          role="group"
          aria-label="Reverb stereo inputs"
          style={{
            width: "calc(100% - 8px)",
            padding: "6px 4px 5px",
            boxSizing: "border-box",
            border:
              "1px solid color-mix(in srgb, var(--module-accent) 55%, #68737b)",
            borderRadius: "18px 7px 15px 9px / 11px 18px 8px 15px",
            background:
              "linear-gradient(145deg, color-mix(in srgb, var(--module-accent) 24%, white), color-mix(in srgb, var(--module-accent) 12%, #dce1e4))",
            boxShadow:
              "inset 0 1px 0 rgb(255 255 255 / 70%), 0 2px 5px rgb(0 0 0 / 12%)",
          }}
        >
          <div
            style={{
              marginBottom: 5,
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textAlign: "center",
              color: "var(--module-accent)",
            }}
          >
            INPUT
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              justifyItems: "center",
              gap: 2,
            }}
          >
            {mkPort(
              { id: "reverb-audio-in-l", label: "L IN", type: "input" },
              "vertical",
            )}
            {mkPort(
              { id: "reverb-audio-in-r", label: "R IN", type: "input" },
              "vertical",
            )}
          </div>
        </div>
        <div
          role="group"
          aria-label="Reverb stereo outputs"
          style={{
            width: "calc(100% - 8px)",
            padding: "6px 4px 5px",
            boxSizing: "border-box",
            border:
              "1px solid color-mix(in srgb, var(--module-accent) 55%, #68737b)",
            borderRadius: "7px 18px 9px 15px / 18px 10px 15px 8px",
            background:
              "linear-gradient(215deg, color-mix(in srgb, var(--module-accent) 24%, white), color-mix(in srgb, var(--module-accent) 12%, #dce1e4))",
            boxShadow:
              "inset 0 1px 0 rgb(255 255 255 / 70%), 0 2px 5px rgb(0 0 0 / 12%)",
          }}
        >
          <div
            style={{
              marginBottom: 5,
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textAlign: "center",
              color: "var(--module-accent)",
            }}
          >
            OUTPUT
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              justifyItems: "center",
              gap: 2,
            }}
          >
            {mkPort(
              { id: "reverb-audio-out-l", label: "L OUT", type: "output" },
              "vertical",
            )}
            {mkPort(
              { id: "reverb-audio-out-r", label: "R OUT", type: "output" },
              "vertical",
            )}
          </div>
        </div>
      </div>
    </ModuleFrontPanel>
  )
}
