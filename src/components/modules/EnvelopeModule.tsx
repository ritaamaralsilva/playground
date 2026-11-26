import React from "react"
import { Knob } from "../ui/Knob"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import type { PortDef } from "../engine/types"

interface EnvelopeModuleProps {
  attack: number
  decay: number
  sustain: number
  release: number
  onAttackChange: (v: number) => void
  onDecayChange: (v: number) => void
  onSustainChange: (v: number) => void
  onReleaseChange: (v: number) => void
  mkPort: (def: PortDef) => React.ReactNode
}

export function EnvelopeModule({
  attack,
  decay,
  sustain,
  release,
  onAttackChange,
  onDecayChange,
  onSustainChange,
  onReleaseChange,
  mkPort,
}: EnvelopeModuleProps) {
  return (
    <ModuleFrontPanel title="adsr" width={130}>
      <Knob
        value={attack}
        min={0.01} // min attack set to 0.01s to avoid clicks
        max={2} // 2s max attack time
        label="attack"
        sublabel={`${attack.toFixed(2)}s`}
        onChange={onAttackChange}
      />
      <Knob
        value={decay}
        min={0.01} // min decay set to 0.01s to avoid clicks
        max={2} // 2s max decay time
        label="decay"
        sublabel={`${decay.toFixed(2)}s`}
        onChange={onDecayChange}
      />
      <Knob
        value={sustain}
        min={0.01} // min sustain set to 0.01s to avoid clicks
        max={5} // 4s max sustain time
        label="sustain"
        sublabel={`${sustain.toFixed(2)}s`} 
        onChange={onSustainChange}
      />
      <Knob
        value={release}
        min={0.01} // min release set to 0.01s to avoid clicks
        max={3} // 3s max release time
        label="release"
        sublabel={`${release.toFixed(2)}s`}
        onChange={onReleaseChange}
      />
      <PortSection>
        {mkPort({ id: "adsr-gate-in", label: "gate in", type: "input" })}
        {mkPort({ id: "adsr-env-out", label: "env out", type: "output" })}
      </PortSection>
    </ModuleFrontPanel>
  )
}
