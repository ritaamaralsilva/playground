import React from "react"
import { Knob } from "../ui/Knob"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import type { PortDef } from "../engine/types"

interface ReverbModuleProps {
  reverbSize: number
  reverbMix: number
  onSizeChange: (v: number) => void
  onMixChange: (v: number) => void
  mkPort: (def: PortDef) => React.ReactNode
}

export function ReverbModule({
  reverbSize,
  reverbMix,
  onSizeChange,
  onMixChange,
  mkPort,
}: ReverbModuleProps) {
  return (
    <ModuleFrontPanel title="reverb" width={110}>
      <Knob
        value={reverbSize}
        min={0.01}
        max={1}
        label="size"
        sublabel={`${Math.round(reverbSize * 100)}%`}
        onChange={onSizeChange}
      />
      <Knob
        value={reverbMix}
        min={0}
        max={1}
        label="mix"
        sublabel={`${Math.round(reverbMix * 100)}%`}
        onChange={onMixChange}
      />
      <PortSection>
        {mkPort({ id: "reverb-audio-in", label: "audio in", type: "input" })}
        {mkPort({ id: "reverb-audio-out", label: "audio out", type: "output" })}
      </PortSection>
    </ModuleFrontPanel>
  )
}
