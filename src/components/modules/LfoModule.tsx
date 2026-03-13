import React from "react"
import { Knob } from "../ui/Knob"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import type { PortDef } from "../engine/types"

interface LfoModuleProps {
  lfoRate: number
  lfoDepth: number
  onRateChange: (v: number) => void
  onDepthChange: (v: number) => void
  mkPort: (def: PortDef) => React.ReactNode
}

export function LfoModule({
  lfoRate,
  lfoDepth,
  onRateChange,
  onDepthChange,
  mkPort,
}: LfoModuleProps) {
  return (
    <ModuleFrontPanel title="lfo" width={110}>
      <Knob
        value={lfoRate}
        min={0.01}
        max={20}
        label="rate"
        sublabel={`${lfoRate.toFixed(1)} Hz`}
        onChange={onRateChange}
      />
      <Knob
        value={lfoDepth}
        min={0}
        max={800}
        label="depth"
        sublabel={`${Math.round(lfoDepth)}`}
        onChange={onDepthChange}
      />
      <PortSection>
        {mkPort({ id: "lfo-out", label: "out", type: "output" })}
      </PortSection>
    </ModuleFrontPanel>
  )
}
