import React from "react"
import { Knob } from "../ui/Knob"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import type { PortDef } from "../engine/types"

interface AttenuverterModuleProps {
  amount: number
  offset: number
  onAmountChange: (amount: number) => void
  onOffsetChange: (offset: number) => void
  mkPort: (def: PortDef) => React.ReactNode
}

export function AttenuverterModule({
  amount,
  offset,
  onAmountChange,
  onOffsetChange,
  mkPort,
}: AttenuverterModuleProps) {
  return (
    <ModuleFrontPanel title="attenuverter" width={128} tone="attenuverter">
      <Knob
        value={amount}
        min={-1}
        max={1}
        label="amount"
        sublabel={`${amount >= 0 ? "+" : ""}${amount.toFixed(2)}x`}
        onChange={onAmountChange}
      />
      <Knob
        value={offset}
        min={-5}
        max={5}
        label="offset"
        sublabel={`${offset >= 0 ? "+" : ""}${offset.toFixed(1)} V`}
        onChange={onOffsetChange}
      />
      <PortSection>
        {mkPort({ id: "attenuverter-cv-in", label: "cv in", type: "input" })}
        {mkPort({ id: "attenuverter-cv-out", label: "cv out", type: "output" })}
      </PortSection>
    </ModuleFrontPanel>
  )
}
