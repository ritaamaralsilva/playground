import React from "react"
import { Knob } from "../ui/Knob"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import type { PortDef } from "../engine/types"

interface VcaModuleProps {
  vcaLevel: number
  onLevelChange: (v: number) => void
  waveRef: React.Ref<HTMLCanvasElement>
  mkPort: (def: PortDef) => React.ReactNode
}

export function VcaModule({
  vcaLevel,
  onLevelChange,
  waveRef,
  mkPort,
}: VcaModuleProps) {
  return (
    <ModuleFrontPanel title="vca" width={110}>
      <Knob
        value={vcaLevel}
        min={0}
        max={1}
        label="level"
        sublabel={`${Math.round(vcaLevel * 100)}%`}
        onChange={onLevelChange}
      />
      <canvas
        ref={waveRef}
        width={90}
        height={28}
        className="rounded"
        style={{ background: "#050505", border: "1px solid #1e1a14" }}
      />
      <PortSection>
        {mkPort({ id: "vca-cv-in", label: "cv in", type: "input" })}
        {mkPort({ id: "vca-audio-in", label: "audio in", type: "input" })}
        {mkPort({ id: "vca-out", label: "out", type: "output" })}
      </PortSection>
    </ModuleFrontPanel>
  )
}
