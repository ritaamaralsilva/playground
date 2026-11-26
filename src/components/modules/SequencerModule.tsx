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

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "8px",
  color: "var(--muted)",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
}

const arrowStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "10px",
  color: "var(--module-accent)",
  lineHeight: 1,
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "0 4px",
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
    <ModuleFrontPanel title="5 STEP SEQUENCER" width={270} tone="sequencer">
      <div
        style={{
          display: "flex",
          gap: "12px",
          width: "100%",
          padding: "0 16px",
          boxSizing: "border-box",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "5px",
            marginTop: "20px",
          }}
        >
          <span style={{ ...labelStyle, textAlign: "center", width: "100%" }}>
            scale
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              width: "100%",
            }}
          >
            <button
              onClick={() =>
                onScaleChange(
                  (scaleIdx - 1 + SCALE_NAMES.length) % SCALE_NAMES.length
                )
              }
              style={arrowStyle}
            >
              ◀
            </button>
            <DigitalDisplay value={SCALE_NAMES[scaleIdx]} width={72} />
            <button
              onClick={() => onScaleChange((scaleIdx + 1) % SCALE_NAMES.length)}
              style={arrowStyle}
            >
              ▶
            </button>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "5px",
            marginTop: "20px",
          }}
        >
          <span style={{ ...labelStyle, textAlign: "center", width: "100%" }}>
            root
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
          >
            <button
              onClick={() => onRootChange((rootIdx - 1 + 12) % 12)}
              style={arrowStyle}
            >
              ◀
            </button>
            <DigitalDisplay value={ROOT_NOTES[rootIdx]} width={30} />
            <button
              onClick={() => onRootChange((rootIdx + 1) % 12)}
              style={arrowStyle}
            >
              ▶
            </button>
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-center">
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
                  width: 6,
                  height: 6,
                  marginTop: "24px",
                  marginBottom: "4px",
                  background:
                    seqStep === i
                      ? "var(--module-accent)"
                      : "color-mix(in srgb, var(--module-accent) 14%, var(--surface))",
                  boxShadow:
                    seqStep === i
                      ? "0 0 7px color-mix(in srgb, var(--module-accent) 42%, transparent)"
                      : "none",
                  border:
                    seqStep === i
                      ? "1px solid var(--module-accent)"
                      : "1px solid var(--line)",
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
