import React from "react"
import { Knob } from "../ui/Knob"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import { formatGainDb } from "../engine/utils"
import type { PortDef } from "../engine/types"

export interface SpectralPhaserSettings {
  rate: number
  depth: number
  resonance: number
  feedback: number
  mix: number
  output: number
  low: number
  high1: number
  high2: number
  lowFrequency: number
  high1Frequency: number
  high2Frequency: number
  sweep: number
  phase: number
  stereoWidth: number
  lowRate: number
  highRate: number
  shape: number
  sync: boolean
}

export const DEFAULT_SPECTRAL_PHASER_SETTINGS: SpectralPhaserSettings = {
  rate: 0.35,
  depth: 0.65,
  resonance: 0.42,
  feedback: 0.22,
  mix: 0.58,
  output: 1,
  low: 0.58,
  high1: 0.74,
  high2: 0.7,
  lowFrequency: 87,
  high1Frequency: 958,
  high2Frequency: 1279,
  sweep: 0.55,
  phase: 0.15,
  stereoWidth: 0.2,
  lowRate: 0.45,
  highRate: 1.3,
  shape: 0,
  sync: false,
}

const lfoShapes = [
  { value: 0, label: "SINE" },
  { value: 1, label: "TRI" },
  { value: 2, label: "SQUARE" },
  { value: 3, label: "RANDOM" },
  { value: 4, label: "S&H" },
]

interface SpectralPhaserModuleProps {
  settings: SpectralPhaserSettings
  onSettingsChange: (patch: Partial<SpectralPhaserSettings>) => void
  bpm: number
  mkPort: (
    def: PortDef,
    orientation?: "horizontal" | "vertical",
  ) => React.ReactNode
}

export function SpectralPhaserModule({
  settings,
  onSettingsChange,
  bpm,
  mkPort,
}: SpectralPhaserModuleProps) {
  const bandGain = (level: number, highBandBoost = 0) =>
    `+${Math.round(level * (5 + settings.resonance * 11 + highBandBoost))}dB`
  const cvPort = (id: PortDef["id"], label: string) =>
    mkPort({ id, label, type: "input" }, "vertical")
  const controlWithCv = (
    control: React.ReactNode,
    id: PortDef["id"],
    label: string,
  ) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        minWidth: 0,
      }}
    >
      {control}
      {cvPort(id, label)}
    </div>
  )

  return (
    <ModuleFrontPanel title="Spectral Phaser" width={330} tone="spectralphaser">
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          minHeight: 0,
          flexDirection: "column",
          gap: 8,
          boxSizing: "border-box",
        }}
      >
        <div
          role="group"
          aria-label="Main controls"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            justifyItems: "center",
            gap: "2px 2px",
          }}
        >
          {controlWithCv(
            <Knob
              value={settings.rate}
              min={0.03}
              max={8}
              scale="log"
              label="RATE"
              sublabel={`${settings.rate.toFixed(2)} Hz`}
              size={20}
              onChange={(rate) => onSettingsChange({ rate })}
            />,
            "spectral-phaser-rate-cv-in",
            "rate cv",
          )}
          {controlWithCv(
            <Knob
              value={settings.depth}
              min={0}
              max={1}
              label="DEPTH"
              sublabel={settings.depth.toFixed(2)}
              size={20}
              onChange={(depth) => onSettingsChange({ depth })}
            />,
            "spectral-phaser-depth-cv-in",
            "depth cv",
          )}
          {controlWithCv(
            <Knob
              value={settings.resonance}
              min={0}
              max={1}
              label="RESONANCE"
              sublabel={settings.resonance.toFixed(2)}
              size={20}
              onChange={(resonance) => onSettingsChange({ resonance })}
            />,
            "spectral-phaser-resonance-cv-in",
            "res cv",
          )}
          {controlWithCv(
            <Knob
              value={settings.feedback}
              min={0}
              max={0.8}
              label="FEEDBACK"
              sublabel={settings.feedback.toFixed(2)}
              size={20}
              onChange={(feedback) => onSettingsChange({ feedback })}
            />,
            "spectral-phaser-feedback-cv-in",
            "fb cv",
          )}
          {controlWithCv(
            <Knob
              value={settings.mix}
              min={0}
              max={1}
              label="MIX"
              sublabel={settings.mix.toFixed(2)}
              size={20}
              onChange={(mix) => onSettingsChange({ mix })}
            />,
            "spectral-phaser-mix-cv-in",
            "mix cv",
          )}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Knob
              value={settings.output}
              min={0}
              max={1.5}
              label="OUTPUT"
              sublabel={formatGainDb(settings.output)}
              size={20}
              onChange={(output) => onSettingsChange({ output })}
            />
          </div>
        </div>

        <div
          role="group"
          aria-label="Spectral bands"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 2,
            padding: "6px 4px",
            borderTop:
              "1px solid color-mix(in srgb, var(--module-accent) 42%, var(--line))",
            borderBottom:
              "1px solid color-mix(in srgb, var(--module-accent) 42%, var(--line))",
            background:
              "color-mix(in srgb, var(--module-accent) 8%, var(--surface))",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              justifyItems: "center",
              gap: "4px 0",
              minWidth: 0,
            }}
          >
            <Knob
              value={settings.low}
              min={0}
              max={1}
              label="LOW"
              sublabel={bandGain(settings.low)}
              size={16}
              onChange={(low) => onSettingsChange({ low })}
            />
            <Knob
              value={settings.lowFrequency}
              min={30}
              max={500}
              scale="log"
              label="FREQ"
              sublabel={`${settings.lowFrequency.toFixed(0)}Hz`}
              size={16}
              onChange={(lowFrequency) => onSettingsChange({ lowFrequency })}
            />
            {cvPort("spectral-phaser-low-cv-in", "low cv")}
            <span aria-hidden="true" />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              justifyItems: "center",
              gap: "4px 0",
              minWidth: 0,
            }}
          >
            <Knob
              value={settings.high1}
              min={0}
              max={1}
              label="HIGH 1"
              sublabel={bandGain(settings.high1, 2)}
              size={16}
              onChange={(high1) => onSettingsChange({ high1 })}
            />
            <Knob
              value={settings.high1Frequency}
              min={300}
              max={5000}
              scale="log"
              label="FREQ"
              sublabel={`${settings.high1Frequency.toFixed(0)}Hz`}
              size={16}
              onChange={(high1Frequency) =>
                onSettingsChange({ high1Frequency })
              }
            />
            {cvPort("spectral-phaser-high1-cv-in", "high 1 cv")}
            <span aria-hidden="true" />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              justifyItems: "center",
              gap: "4px 0",
              minWidth: 0,
            }}
          >
            <Knob
              value={settings.high2}
              min={0}
              max={1}
              label="HIGH 2"
              sublabel={bandGain(settings.high2, 2)}
              size={16}
              onChange={(high2) => onSettingsChange({ high2 })}
            />
            <Knob
              value={settings.high2Frequency}
              min={400}
              max={8000}
              scale="log"
              label="FREQ"
              sublabel={`${settings.high2Frequency.toFixed(0)}Hz`}
              size={16}
              onChange={(high2Frequency) =>
                onSettingsChange({ high2Frequency })
              }
            />
            {cvPort("spectral-phaser-high2-cv-in", "high 2 cv")}
            <span aria-hidden="true" />
          </div>
        </div>

        <div
          role="group"
          aria-label="Modulation controls"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "var(--muted)",
              }}
            >
              LFO SHAPE
            </span>
            <button
              type="button"
              aria-pressed={settings.sync}
              aria-label={`Tempo sync ${settings.sync ? "on" : "off"}`}
              onClick={() => onSettingsChange({ sync: !settings.sync })}
              style={{
                padding: "3px 7px",
                border: "1px solid var(--module-accent)",
                borderRadius: 4,
                background: settings.sync
                  ? "color-mix(in srgb, var(--module-accent) 28%, var(--surface))"
                  : "var(--surface-raised)",
                color: "var(--ink)",
                fontFamily: "var(--font-mono)",
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.08em",
                cursor: "pointer",
              }}
            >
              {settings.sync ? `SYNC ${bpm}` : "FREE"}
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
              gap: 3,
            }}
          >
            {lfoShapes.map(({ value, label }) => {
              const selected = settings.shape === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-label={`LFO shape ${label}`}
                  aria-pressed={selected}
                  onClick={() => onSettingsChange({ shape: value })}
                  style={{
                    minWidth: 0,
                    padding: "4px 1px",
                    border: `1px solid ${selected ? "var(--module-accent)" : "var(--line)"}`,
                    borderRadius: 4,
                    background: selected
                      ? "color-mix(in srgb, var(--module-accent) 28%, var(--surface))"
                      : "var(--surface-raised)",
                    color: "var(--ink)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 7,
                    fontWeight: 700,
                    letterSpacing: "0.03em",
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              justifyItems: "center",
              gap: "2px 2px",
            }}
          >
            {controlWithCv(
              <Knob
                value={settings.sweep}
                min={0}
                max={1}
                label="SWEEP"
                sublabel={settings.sweep.toFixed(2)}
                size={16}
                onChange={(sweep) => onSettingsChange({ sweep })}
              />,
              "spectral-phaser-sweep-cv-in",
              "sweep cv",
            )}
            <Knob
              value={settings.phase}
              min={0}
              max={1}
              label="PHASE"
              sublabel={`${Math.round(settings.phase * 360)}°`}
              size={16}
              onChange={(phase) => onSettingsChange({ phase })}
            />
            <Knob
              value={settings.stereoWidth}
              min={0}
              max={1}
              label="STEREO"
              sublabel={`${Math.round(settings.stereoWidth * 90)}°`}
              size={16}
              onChange={(stereoWidth) => onSettingsChange({ stereoWidth })}
            />
            {controlWithCv(
              <Knob
                value={settings.lowRate}
                min={0.1}
                max={4}
                scale="log"
                label="LOW RATE"
                sublabel={`${settings.lowRate.toFixed(2)}x`}
                size={16}
                onChange={(lowRate) => onSettingsChange({ lowRate })}
              />,
              "spectral-phaser-low-rate-cv-in",
              "lo rt cv",
            )}
            {controlWithCv(
              <Knob
                value={settings.highRate}
                min={0.1}
                max={4}
                scale="log"
                label="HIGH RATE"
                sublabel={`${settings.highRate.toFixed(2)}x`}
                size={16}
                onChange={(highRate) => onSettingsChange({ highRate })}
              />,
              "spectral-phaser-high-rate-cv-in",
              "hi rt cv",
            )}
          </div>
        </div>

        <PortSection
          style={{
            padding: "4px",
            marginBottom: "4px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "2px 3px",
            }}
          >
            {mkPort({
              id: "spectral-phaser-audio-in",
              label: "audio in",
              type: "input",
            })}
            {mkPort({
              id: "spectral-phaser-audio-out",
              label: "audio out",
              type: "output",
            })}
          </div>
        </PortSection>
      </div>
    </ModuleFrontPanel>
  )
}
