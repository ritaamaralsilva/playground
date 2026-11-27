import React from "react"
import { Knob } from "../ui/Knob"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import { formatGainDb } from "../engine/utils"
import type { PortDef } from "../engine/types"

interface HarmonicOscillatorModuleProps {
  frequency: number
  levels: number[]
  center: number
  width: number
  tilt: number
  linearFmDepth: number
  exponentialFmAmount: number
  centerCvDepth: number
  widthCvDepth: number
  onFrequencyChange: (frequency: number) => void
  onLevelChange: (partial: number, level: number) => void
  onCenterChange: (center: number) => void
  onWidthChange: (width: number) => void
  onTiltChange: (tilt: number) => void
  onLinearFmDepthChange: (depth: number) => void
  onExponentialFmAmountChange: (amount: number) => void
  onCenterCvDepthChange: (depth: number) => void
  onWidthCvDepthChange: (depth: number) => void
  mkPort: (
    def: PortDef,
    orientation?: "horizontal" | "vertical",
  ) => React.ReactNode
}

const HARMONIC_OUTPUTS: PortDef[] = [
  { id: "harmonic-1-out", label: "out", type: "output" },
  { id: "harmonic-2-out", label: "out", type: "output" },
  { id: "harmonic-3-out", label: "out", type: "output" },
  { id: "harmonic-4-out", label: "out", type: "output" },
  { id: "harmonic-5-out", label: "out", type: "output" },
  { id: "harmonic-6-out", label: "out", type: "output" },
  { id: "harmonic-7-out", label: "out", type: "output" },
  { id: "harmonic-8-out", label: "out", type: "output" },
]

const EXTRA_OUTPUTS: PortDef[] = [
  { id: "harmonic-triangle-out", label: "triangle", type: "output" },
  { id: "harmonic-square-out", label: "square", type: "output" },
  { id: "harmonic-saw-out", label: "sawtooth", type: "output" },
  { id: "harmonic-out", label: "mix", type: "output" },
]

const CORE_INPUTS: PortDef[] = [
  { id: "harmonic-v-oct-in", label: "v/oct in", type: "input" },
  { id: "harmonic-lin-fm-in", label: "lin fm in", type: "input" },
  { id: "harmonic-exp-fm-in", label: "exp cv in", type: "input" },
]

const CENTER_CV_INPUT: PortDef = {
  id: "harmonic-center-cv-in",
  label: "center in",
  type: "input",
}

const WIDTH_CV_INPUT: PortDef = {
  id: "harmonic-width-cv-in",
  label: "width in",
  type: "input",
}

const HARMONIC_LEVEL_INPUTS: PortDef[] = [
  { id: "harmonic-1-level-cv-in", label: "cv in", type: "input" },
  { id: "harmonic-2-level-cv-in", label: "cv in", type: "input" },
  { id: "harmonic-3-level-cv-in", label: "cv in", type: "input" },
  { id: "harmonic-4-level-cv-in", label: "cv in", type: "input" },
  { id: "harmonic-5-level-cv-in", label: "cv in", type: "input" },
  { id: "harmonic-6-level-cv-in", label: "cv in", type: "input" },
  { id: "harmonic-7-level-cv-in", label: "cv in", type: "input" },
  { id: "harmonic-8-level-cv-in", label: "cv in", type: "input" },
]

function signedMultiplier(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}x`
}

export function HarmonicOscillatorModule({
  frequency,
  levels,
  center,
  width,
  tilt,
  linearFmDepth,
  exponentialFmAmount,
  centerCvDepth,
  widthCvDepth,
  onFrequencyChange,
  onLevelChange,
  onCenterChange,
  onWidthChange,
  onTiltChange,
  onLinearFmDepthChange,
  onExponentialFmAmountChange,
  onCenterCvDepthChange,
  onWidthCvDepthChange,
  mkPort,
}: HarmonicOscillatorModuleProps) {
  const portHeadingStyle: React.CSSProperties = {
    marginBottom: 5,
    fontFamily: "var(--font-mono)",
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "var(--muted)",
    textTransform: "uppercase",
  }

  return (
    <ModuleFrontPanel title="harmonic oscillator" width={320} tone="harmonic">
      <section
        aria-label="Oscillator and harmonic sweep controls"
        style={{ width: "100%" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            justifyItems: "center",
            gap: 2,
          }}
        >
          <Knob
            value={frequency}
            min={3}
            max={20000}
            scale="log"
            label="frequency"
            sublabel={`${Math.round(frequency)} Hz`}
            size={26}
            onChange={onFrequencyChange}
          />
          <Knob
            value={linearFmDepth}
            min={0}
            max={1}
            label="linear fm"
            sublabel={`${linearFmDepth.toFixed(2)}x`}
            size={26}
            onChange={onLinearFmDepthChange}
          />
          <Knob
            value={exponentialFmAmount}
            min={-1}
            max={1}
            label="exp cv"
            sublabel={signedMultiplier(exponentialFmAmount)}
            size={26}
            onChange={onExponentialFmAmountChange}
          />
          <Knob
            value={center}
            min={1}
            max={8}
            label="center"
            sublabel={center.toFixed(1)}
            size={26}
            onChange={onCenterChange}
          />
          <Knob
            value={width}
            min={0.5}
            max={8}
            label="width"
            sublabel={width.toFixed(1)}
            size={26}
            onChange={onWidthChange}
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            justifyItems: "center",
            gap: 4,
            marginTop: 12,
            padding: "8px 6px",
            borderRadius: 9,
            background:
              "linear-gradient(145deg, rgb(255 255 255 / 54%), color-mix(in srgb, var(--module-accent) 11%, var(--surface)))",
            border:
              "1px solid color-mix(in srgb, var(--module-accent) 34%, var(--line))",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <Knob
              value={centerCvDepth}
              min={-1}
              max={1}
              label="center cv"
              sublabel={signedMultiplier(centerCvDepth)}
              size={24}
              onChange={onCenterCvDepthChange}
            />
            {mkPort(CENTER_CV_INPUT, "vertical")}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <Knob
              value={widthCvDepth}
              min={-1}
              max={1}
              label="width cv"
              sublabel={signedMultiplier(widthCvDepth)}
              size={24}
              onChange={onWidthCvDepthChange}
            />
            {mkPort(WIDTH_CV_INPUT, "vertical")}
          </div>
          <Knob
            value={tilt}
            min={-1}
            max={1}
            label="tilt"
            sublabel={signedMultiplier(tilt)}
            size={24}
            onChange={onTiltChange}
          />
        </div>
      </section>

      <section
        aria-label="Eight harmonic levels and individual inputs and outputs"
        style={{
          width: "100%",
          padding: "8px 6px",
          borderRadius: 9,
          background:
            "linear-gradient(145deg, rgb(255 255 255 / 60%), color-mix(in srgb, var(--module-accent) 15%, var(--surface)))",
          border:
            "1px solid color-mix(in srgb, var(--module-accent) 42%, white)",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            marginBottom: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "var(--muted)",
            textTransform: "uppercase",
          }}
        >
          Partial levels and individual I/O
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
            gap: 3,
          }}
        >
          {levels.map((level, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 5,
                minWidth: 0,
                fontFamily: "var(--font-mono)",
                color: "var(--muted)",
              }}
            >
              <span style={{ fontSize: 8, fontWeight: 700 }}>H{index + 1}</span>
              {mkPort(HARMONIC_LEVEL_INPUTS[index], "vertical")}
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={level}
                aria-label={`Harmonic ${index + 1} level`}
                onChange={(event) =>
                  onLevelChange(index, Number(event.currentTarget.value))
                }
                style={{
                  width: 18,
                  height: 66,
                  margin: 0,
                  writingMode: "vertical-lr",
                  direction: "rtl",
                  accentColor: "var(--module-accent)",
                  cursor: "pointer",
                }}
              />
              <span
                style={{
                  fontSize: 6,
                  whiteSpace: "nowrap",
                  color: "var(--module-accent)",
                }}
              >
                {formatGainDb(level)}
              </span>
              {mkPort(HARMONIC_OUTPUTS[index], "vertical")}
            </div>
          ))}
        </div>
      </section>

      <PortSection>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.15fr",
            gap: 8,
            alignItems: "start",
          }}
        >
          <div>
            <div style={portHeadingStyle}>WAVEFORM OUTPUTS</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "4px 2px",
              }}
            >
              {EXTRA_OUTPUTS.map((port) => (
                <React.Fragment key={port.id}>{mkPort(port)}</React.Fragment>
              ))}
            </div>
          </div>
          <div>
            <div style={portHeadingStyle}>PITCH CV INPUTS</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "4px 2px",
              }}
            >
              {CORE_INPUTS.map((port) => (
                <React.Fragment key={port.id}>{mkPort(port)}</React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </PortSection>
    </ModuleFrontPanel>
  )
}
