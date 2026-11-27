import React from "react"
import { Knob } from "../ui/Knob"
import { AudioMeter } from "../ui/AudioMeter"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import { formatGainDb } from "../engine/utils"
import type { PortDef } from "../engine/types"

interface MixerModuleProps {
  masterVol: number
  isActive: boolean
  analyser: AnalyserNode | null
  onVolChange: (v: number) => void
  mkPort: (def: PortDef) => React.ReactNode
}

export function MixerModule({
  masterVol,
  isActive,
  analyser,
  onVolChange,
  mkPort,
}: MixerModuleProps) {
  return (
    <ModuleFrontPanel title="Audio Out" width={90} tone="output">
      <div
        className="w-2.5 h-2.5 rounded-full transition-all duration-150"
        style={{
          background: isActive
            ? "var(--module-accent)"
            : "color-mix(in srgb, var(--module-accent) 14%, var(--surface))",
          boxShadow: isActive
            ? "0 0 8px color-mix(in srgb, var(--module-accent) 42%, transparent)"
            : "none",
          border:
            "1px solid color-mix(in srgb, var(--module-accent) 45%, var(--line))",
        }}
      />
      <AudioMeter
        analyser={analyser}
        label="Master output level"
        width={44}
        height={116}
      />
      <Knob
        value={masterVol}
        min={0}
        max={1}
        label="level"
        sublabel={formatGainDb(masterVol)}
        onChange={onVolChange}
      />
      <PortSection>
        {mkPort({ id: "out-in", label: "in", type: "input" })}
      </PortSection>
    </ModuleFrontPanel>
  )
}
