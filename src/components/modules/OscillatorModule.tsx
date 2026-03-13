import React from "react"
import { Knob } from "../ui/Knob"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import { WAVEFORMS } from "../engine/constants"
import type { PortDef } from "../engine/types"

interface OscillatorModuleProps {
  oscFreq: number
  oscWaveIdx: number
  onFreqChange: (v: number) => void
  onWaveChange: (v: number) => void
  mkPort: (def: PortDef) => React.ReactNode
}

export function OscillatorModule({
  oscFreq,
  oscWaveIdx,
  onFreqChange,
  onWaveChange,
  mkPort,
}: OscillatorModuleProps) {
  return (
    <ModuleFrontPanel title="osc" width={130}>
      <Knob
        value={oscFreq}
        min={20}
        max={2000}
        label="freq"
        sublabel={`${Math.round(oscFreq)} Hz`}
        onChange={onFreqChange}
      />
      <Knob
        value={oscWaveIdx}
        min={0}
        max={3}
        label="wave"
        sublabel={WAVEFORMS[Math.round(oscWaveIdx)]}
        onChange={(v) => onWaveChange(Math.round(v))}
      />
      <PortSection>
        {mkPort({ id: "osc-voct-in", label: "v/oct in", type: "input" })}
        {mkPort({ id: "osc-fm-in", label: "fm in", type: "input" })}
        {mkPort({ id: "osc-out", label: "out", type: "output" })}
      </PortSection>
    </ModuleFrontPanel>
  )
}
