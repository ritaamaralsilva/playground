import React from "react"
import { Knob } from "../ui/Knob"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import { formatGainDb } from "../engine/utils"
import type { NoiseColor, PortDef } from "../engine/types"

interface NoiseModuleProps {
  color: NoiseColor
  level: number
  onColorChange: (color: NoiseColor) => void
  onLevelChange: (level: number) => void
  mkPort: (
    def: PortDef,
    orientation?: "horizontal" | "vertical",
  ) => React.ReactNode
}

const noiseColors: { name: NoiseColor; accent: string }[] = [
  { name: "white", accent: "#eee9d9" },
  { name: "pink", accent: "#e89bb9" },
  { name: "brown", accent: "#987054" },
]

export function NoiseModule({
  color,
  level,
  onColorChange,
  onLevelChange,
  mkPort,
}: NoiseModuleProps) {
  return (
    <ModuleFrontPanel title="Noise" width={80} tone="noise">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        <Knob
          value={level}
          min={0}
          max={1}
          label="output"
          sublabel={formatGainDb(level)}
          size={32}
          onChange={onLevelChange}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 7,
            width: "100%",
          }}
        >
          <span
            style={{
              width: "100%",
              fontFamily: "var(--font-mono)",
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "var(--muted)",
              textAlign: "center",
            }}
          >
            COLOR
          </span>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              width: "100%",
            }}
          >
            {noiseColors.map(({ name, accent }) => {
              const selected = color === name
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onColorChange(name)}
                  style={{
                    minHeight: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    width: "100%",
                    padding: "3px 4px",
                    borderRadius: 5,
                    border: selected
                      ? `2px solid ${accent}`
                      : "1px solid var(--line)",
                    background: selected
                      ? `color-mix(in srgb, ${accent} 24%, var(--surface))`
                      : "var(--surface-raised)",
                    color: "var(--ink)",
                    boxShadow: selected
                      ? `0 0 8px color-mix(in srgb, ${accent} 48%, transparent)`
                      : "none",
                    cursor: "pointer",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 12,
                      height: 12,
                      flexShrink: 0,
                      borderRadius: "50%",
                      background: accent,
                      border:
                        "1px solid color-mix(in srgb, var(--ink) 24%, transparent)",
                      boxShadow: `0 0 5px color-mix(in srgb, ${accent} 55%, transparent)`,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 7,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <PortSection
          style={{
            alignItems: "center",
            padding: "6px 4px",
          }}
        >
          {mkPort(
            { id: "noise-out", label: "audio out", type: "output" },
            "vertical",
          )}
        </PortSection>
      </div>
    </ModuleFrontPanel>
  )
}
