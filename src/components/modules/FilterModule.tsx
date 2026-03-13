import React from "react"
import { Knob } from "../ui/Knob"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import type { PortDef } from "../engine/types"

interface FilterModuleProps {
  filterType: BiquadFilterType
  filterCutoff: number
  filterRes: number
  onTypeChange: (t: BiquadFilterType) => void
  onCutoffChange: (v: number) => void
  onResChange: (v: number) => void
  mkPort: (def: PortDef) => React.ReactNode
}

export function FilterModule({
  filterType,
  filterCutoff,
  filterRes,
  onTypeChange,
  onCutoffChange,
  onResChange,
  mkPort,
}: FilterModuleProps) {
  return (
    <ModuleFrontPanel title="filter" width={140} color="#1a1c1a">
      <div className="flex gap-1">
        {(["lowpass", "bandpass", "highpass"] as BiquadFilterType[]).map(
          (t) => (
            <button
              key={t}
              onClick={() => onTypeChange(t)}
              className="text-[7px] font-mono uppercase px-1.5 py-0.5 rounded transition-all"
              style={{
                background: filterType === t ? "#2a4a2a" : "#141414",
                color: filterType === t ? "#4eff4e" : "#444",
                border:
                  filterType === t ? "1px solid #2a6a2a" : "1px solid #222",
              }}
            >
              {t === "lowpass" ? "LP" : t === "bandpass" ? "BP" : "HP"}
            </button>
          )
        )}
      </div>
      <Knob
        value={filterCutoff}
        min={20}
        max={18000}
        label="cutoff"
        sublabel={`${Math.round(filterCutoff)} Hz`}
        onChange={onCutoffChange}
      />
      <Knob
        value={filterRes}
        min={0.1}
        max={20}
        label="res"
        sublabel={filterRes.toFixed(1)}
        onChange={onResChange}
      />
      <PortSection>
        {mkPort({ id: "filter-audio-in", label: "audio in", type: "input" })}
        {mkPort({ id: "filter-cv-in", label: "cv in", type: "input" })}
        {mkPort({ id: "filter-audio-out", label: "audio out", type: "output" })}
      </PortSection>
    </ModuleFrontPanel>
  )
}
