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
        min={0.001}
        max={2}
        label="attack"
        sublabel={`${attack.toFixed(2)}s`}
        onChange={onAttackChange}
      />
      <Knob
        value={decay}
        min={0.01}
        max={2}
        label="decay"
        sublabel={`${decay.toFixed(2)}s`}
        onChange={onDecayChange}
      />
      <Knob
        value={sustain}
        min={0}
        max={1}
        label="sustain"
        sublabel={`${Math.round(sustain * 100)}%`}
        onChange={onSustainChange}
      />
      <Knob
        value={release}
        min={0.01}
        max={4}
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
