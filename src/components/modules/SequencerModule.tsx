import React from "react"
import { Knob } from "../ui/Knob"
import { DigitalDisplay } from "../ui/DigitalDisplay"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import { SCALE_NAMES, ROOT_NOTES } from "../engine/constants"
import { quantizeToScale, midiName } from "../engine/utils"
import type { PortDef } from "../engine/types"

interface SequencerModuleProps {
  seqStep: number
  seqNotes: number[]
  scaleIdx: number
  rootIdx: number
  onScaleChange: (i: number) => void
  onRootChange: (i: number) => void
  onNoteChange: (i: number, v: number) => void
  mkPort: (def: PortDef) => React.ReactNode
}

export function SequencerModule({
  seqStep,
  seqNotes,
  scaleIdx,
  rootIdx,
  onScaleChange,
  onRootChange,
  onNoteChange,
  mkPort,
}: SequencerModuleProps) {
  return (
    <ModuleFrontPanel title="seq — 5 step" width={200} color="#1a1a1e">
      {/* Scale & root selectors */}
      <div className="flex gap-1 w-full">
        <div className="flex flex-col gap-0.5 flex-1">
          <span className="text-[7px] font-mono text-zinc-600 uppercase tracking-wider">
            scale
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                onScaleChange(
                  (scaleIdx - 1 + SCALE_NAMES.length) % SCALE_NAMES.length
                )
              }
              className="text-zinc-600 font-mono text-[10px] px-1"
              style={{ lineHeight: 1 }}
            >
              ◀
            </button>
            <DigitalDisplay value={SCALE_NAMES[scaleIdx]} width={72} />
            <button
              onClick={() => onScaleChange((scaleIdx + 1) % SCALE_NAMES.length)}
              className="text-zinc-600 font-mono text-[10px] px-1"
              style={{ lineHeight: 1 }}
            >
              ▶
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[7px] font-mono text-zinc-600 uppercase tracking-wider">
            root
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onRootChange((rootIdx - 1 + 12) % 12)}
              className="text-zinc-600 font-mono text-[10px] px-0.5"
              style={{ lineHeight: 1 }}
            >
              ◀
            </button>
            <DigitalDisplay value={ROOT_NOTES[rootIdx]} width={30} />
            <button
              onClick={() => onRootChange((rootIdx + 1) % 12)}
              className="text-zinc-600 font-mono text-[10px] px-0.5"
              style={{ lineHeight: 1 }}
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      {/* 5 step knobs */}
      <div className="flex gap-1.5 w-full justify-center">
        {seqNotes.map((note, i) => {
          const quantized = quantizeToScale(
            note,
            SCALE_NAMES[scaleIdx],
            rootIdx
          )
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div
                className="w-2 h-2 rounded-full transition-all duration-75"
                style={{
                  background: seqStep === i ? "#f5a623" : "#1a1a1a",
                  boxShadow: seqStep === i ? "0 0 5px #f5a623" : "none",
                  border: "1px solid #333",
                }}
              />
              <Knob
                value={note}
                min={36}
                max={84}
                label={`s${i + 1}`}
                sublabel={midiName(quantized)}
                size={28}
                onChange={(v) => onNoteChange(i, Math.round(v))}
              />
            </div>
          )
        })}
      </div>

      <PortSection>
        {mkPort({ id: "seq-clock-in", label: "clk in", type: "input" })}
        {mkPort({ id: "seq-cv-out", label: "cv out", type: "output" })}
        {mkPort({ id: "seq-gate-out", label: "gate out", type: "output" })}
      </PortSection>
    </ModuleFrontPanel>
  )
}
