import React from "react"
import { Knob } from "../ui/Knob"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import { formatGainDb } from "../engine/utils"
import type { PortDef } from "../engine/types"

interface RingModModuleProps {
  level: number
  onLevelChange: (level: number) => void
  mkPort: (def: PortDef) => React.ReactNode
}

export function RingModModule({
  level,
  onLevelChange,
  mkPort,
}: RingModModuleProps) {
  return (
    <ModuleFrontPanel title="ring modulator" width={160} tone="ringmod">
      <div
        aria-label="Ring modulation signal flow"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          padding: "8px 6px",
          borderRadius: 9,
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--module-accent) 15%, var(--surface)), var(--surface-raised))",
          border:
            "1px solid color-mix(in srgb, var(--module-accent) 35%, var(--line))",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: "var(--module-accent)",
        }}
      >
        <span>A</span>
        <span aria-hidden="true" style={{ fontSize: 15 }}>
          ×
        </span>
        <span>B</span>
        <span aria-hidden="true">→</span>
        <span>OUT</span>
      </div>
      <Knob
        value={level}
        min={0}
        max={1}
        label="output"
        sublabel={formatGainDb(level)}
        onChange={onLevelChange}
      />
      <PortSection>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 4,
          }}
        >
          {mkPort({ id: "ring-audio-a-in", label: "A input", type: "input" })}
          {mkPort({ id: "ring-audio-b-in", label: "B input", type: "input" })}
        </div>
        {mkPort({ id: "ring-audio-out", label: "audio out", type: "output" })}
      </PortSection>
    </ModuleFrontPanel>
  )
}
