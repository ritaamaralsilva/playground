import React from "react"
import { Knob } from "../ui/Knob"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import type { PortDef } from "../engine/types"

/*
 * Panel layout adapted from Mutable Instruments Clouds by Emilie Gillet.
 * The Clouds hardware design is licensed under CC BY-SA 3.0:
 * https://creativecommons.org/licenses/by-sa/3.0/
 * This adaptation is renamed Cloudy and uses the app's pastel styling,
 * mono audio ports, and controls implemented by its granular processor.
 */
interface CloudyModuleProps {
  position: number
  grainSize: number
  pitch: number
  inputGain: number
  density: number
  texture: number
  feedback: number
  blend: number
  frozen: boolean
  onPositionChange: (position: number) => void
  onGrainSizeChange: (grainSize: number) => void
  onPitchChange: (pitch: number) => void
  onInputGainChange: (inputGain: number) => void
  onDensityChange: (density: number) => void
  onTextureChange: (texture: number) => void
  onFeedbackChange: (feedback: number) => void
  onBlendChange: (blend: number) => void
  onFreezeToggle: () => void
  mkPort: (def: PortDef) => React.ReactNode
}

export function CloudyModule({
  position,
  grainSize,
  pitch,
  inputGain,
  density,
  texture,
  feedback,
  blend,
  frozen,
  onPositionChange,
  onGrainSizeChange,
  onPitchChange,
  onInputGainChange,
  onDensityChange,
  onTextureChange,
  onFeedbackChange,
  onBlendChange,
  onFreezeToggle,
  mkPort,
}: CloudyModuleProps) {
  const cvPortRows: PortDef[][] = [
    [
      { id: "granular-freeze-cv-in", label: "freeze", type: "input" },
      { id: "granular-trigger-cv-in", label: "trigger", type: "input" },
      { id: "granular-position-cv-in", label: "position", type: "input" },
    ],
    [
      { id: "granular-size-cv-in", label: "size", type: "input" },
      { id: "granular-pitch-cv-in", label: "pitch", type: "input" },
      { id: "granular-blend-cv-in", label: "blend", type: "input" },
    ],
  ]

  return (
    <ModuleFrontPanel title="cloudy" width={240} tone="granular">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "3px",
          minHeight: "56px",
          width: "100%",
        }}
      >
        <button
          type="button"
          aria-label={frozen ? "Unfreeze Cloudy" : "Freeze Cloudy"}
          aria-pressed={frozen}
          onClick={onFreezeToggle}
          className="cloudy-freeze-button"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 52 46"
            width="48"
            height="44"
            focusable="false"
          >
            <defs>
              <linearGradient
                id="cloudy-cloud-fill"
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop offset="0%" stopColor="#f4fcff" />
                <stop offset="55%" stopColor="#a9ddf5" />
                <stop offset="100%" stopColor="#74b7e0" />
              </linearGradient>
              <linearGradient
                id="cloudy-frozen-fill"
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#c9efff" />
                <stop offset="100%" stopColor="#86bde5" />
              </linearGradient>
            </defs>
            <path
              d={
                frozen
                  ? "M11.5 33h3v3.5l2 4.5 2-4.5V33H23v3.5l2 4.5 2-4.5V33h4.5v3.5l2 4.5 2-4.5V33h4.5c5 0 8.5-3.6 8.5-8.2s-3.8-8-8.8-8c-1.6-6.1-7-10.1-13-10.1-7.2 0-12.8 4.3-14.5 10.7-5.5 0-9.2 3.7-9.2 8.4S7.2 33 11.5 33Z"
                  : "M11.5 34h29c5 0 8.5-3.6 8.5-8.2s-3.8-8-8.8-8c-1.6-6.1-7-10.1-13-10.1-7.2 0-12.8 4.3-14.5 10.7-5.5 0-9.2 3.7-9.2 8.4S7.2 34 11.5 34Z"
              }
              fill={
                frozen ? "url(#cloudy-frozen-fill)" : "url(#cloudy-cloud-fill)"
              }
              stroke="#438bb9"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {frozen ? (
              <g
                fill="none"
                stroke="#397da9"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              >
                <path d="M26 17.5v10M21.7 20l8.6 5M30.3 20l-8.6 5" />
                <path d="m24.2 18.8 1.8 1.8 1.8-1.8m-3.6 7.4 1.8-1.8 1.8 1.8m-6.3-5.1 2.5.2-.5 2.4m6.3-2.6-2.5.2.5 2.4" />
              </g>
            ) : (
              <path
                d="M17 18c2-5 7-7.5 11-7"
                fill="none"
                stroke="#ffffff"
                strokeLinecap="round"
                strokeOpacity=".8"
                strokeWidth="2"
              />
            )}
          </svg>
        </button>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "8px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "var(--ink)",
            lineHeight: 1,
          }}
        >
          {frozen ? "FROZEN" : "FREEZE"}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          justifyItems: "center",
          gap: "4px",
          marginTop: "8px",
        }}
      >
        <Knob
          value={position}
          min={0}
          max={1}
          label="position"
          sublabel={position.toFixed(2)}
          size={36}
          onChange={onPositionChange}
        />
        <Knob
          value={grainSize}
          min={0.016}
          max={1}
          label="size"
          sublabel={`${Math.round(grainSize * 1000)} ms`}
          size={36}
          onChange={onGrainSizeChange}
        />
        <Knob
          value={pitch}
          min={-2}
          max={2}
          label="pitch"
          sublabel={`${pitch >= 0 ? "+" : ""}${pitch.toFixed(1)} oct`}
          size={36}
          onChange={onPitchChange}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          justifyItems: "center",
          gap: "2px",
          marginTop: "14px",
        }}
      >
        <Knob
          value={inputGain}
          min={0}
          max={2}
          label="in gain"
          sublabel={`${inputGain.toFixed(1)}x`}
          size={18}
          onChange={onInputGainChange}
        />
        <Knob
          value={density}
          min={1}
          max={30}
          label="density"
          sublabel={`${density.toFixed(0)}/s`}
          size={18}
          onChange={onDensityChange}
        />
        <Knob
          value={texture}
          min={0}
          max={1}
          label="texture"
          sublabel={texture.toFixed(2)}
          size={18}
          onChange={onTextureChange}
        />
        <Knob
          value={feedback}
          min={0}
          max={0.9}
          label="feedback"
          sublabel={`${feedback.toFixed(2)}x`}
          size={18}
          onChange={onFeedbackChange}
        />
        <Knob
          value={blend}
          min={0}
          max={1}
          label="blend"
          sublabel={blend.toFixed(2)}
          size={18}
          onChange={onBlendChange}
        />
      </div>

      <PortSection>
        {cvPortRows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "6px",
            }}
          >
            {row.map(mkPort)}
          </div>
        ))}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "8px",
          }}
        >
          {mkPort({
            id: "granular-audio-in",
            label: "audio in",
            type: "input",
          })}
          {mkPort({
            id: "granular-audio-out",
            label: "audio out",
            type: "output",
          })}
        </div>
      </PortSection>
    </ModuleFrontPanel>
  )
}
