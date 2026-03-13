import React from "react"
import { Knob } from "../ui/Knob"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import type { PortDef, PortId } from "../engine/types"

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
    <ModuleFrontPanel title="out" width={90}>
      <div
        className="w-2.5 h-2.5 rounded-full transition-all duration-150"
        style={{
          background: isActive ? "#4eff4e" : "#1a3a1a",
          boxShadow: isActive ? "0 0 6px #4eff4e" : "none",
          border: "1px solid #2a5a2a",
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
