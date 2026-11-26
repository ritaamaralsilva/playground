import React from "react"
import { Knob } from "../ui/Knob"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import type { PortDef } from "../engine/types"

interface MixerModuleProps {
  masterVol: number
  isActive: boolean
  onVolChange: (v: number) => void
  mkPort: (def: PortDef) => React.ReactNode
}

export function MixerModule({
  masterVol,
  isActive,
  onVolChange,
  mkPort,
}: MixerModuleProps) {
  return (
    <ModuleFrontPanel title="out" width={80}>
      <div
        className="w-2.5 h-2.5 rounded-full transition-all duration-150"
        style={{
          background: isActive ? "#f5a623" : "#1a0e00",
          boxShadow: isActive ? "0 0 8px #f5a62388" : "none",
          border: "1px solid #2a1a00",
        }}
      />
      <Knob
        value={masterVol}
        min={0}
        max={1}
        label="vol"
        sublabel={`${Math.round(masterVol * 100)}%`}
        onChange={onVolChange}
      />
      <PortSection>
        {mkPort({ id: "out-in", label: "in", type: "input" })}
      </PortSection>
    </ModuleFrontPanel>
  )
}
