import React from "react"
import { Knob } from "../ui/Knob"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import { wavefolderTransfer } from "../engine/audioModuleNodes"
import type { PortDef } from "../engine/types"

interface WavefolderModuleProps {
  fold: number
  bias: number
  onFoldChange: (fold: number) => void
  onBiasChange: (bias: number) => void
  mkPort: (def: PortDef) => React.ReactNode
}

export function WavefolderModule({
  fold,
  bias,
  onFoldChange,
  onBiasChange,
  mkPort,
}: WavefolderModuleProps) {
  const points = Array.from({ length: 49 }, (_, index) => {
    const input = (index / 48) * 2 - 1
    const output = wavefolderTransfer(input, fold, bias)
    const x = (index / 48) * 120
    const y = 31 - output * 25
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(" ")

  return (
    <ModuleFrontPanel title="wavefolder" width={160} tone="wavefolder">
      <svg
        viewBox="0 0 120 62"
        role="img"
        aria-label="Wavefolder transfer curve"
        style={{
          width: "100%",
          height: 66,
          overflow: "visible",
          borderRadius: 8,
          background:
            "linear-gradient(145deg, color-mix(in srgb, var(--module-accent) 8%, var(--surface)), var(--surface-raised))",
          border:
            "1px solid color-mix(in srgb, var(--module-accent) 30%, var(--line))",
        }}
      >
        <path
          d="M0 31H120M60 4V58"
          fill="none"
          stroke="color-mix(in srgb, var(--module-accent) 24%, var(--line))"
          strokeDasharray="2 3"
        />
        <path
          d={points}
          fill="none"
          stroke="var(--module-accent)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          justifyItems: "center",
          gap: 4,
          width: "100%",
        }}
      >
        <Knob
          value={fold}
          min={0.25}
          max={4}
          label="fold"
          sublabel={`${fold.toFixed(2)}x`}
          size={24}
          onChange={onFoldChange}
        />
        <Knob
          value={bias}
          min={-1}
          max={1}
          label="symmetry"
          sublabel={`${bias >= 0 ? "+" : ""}${bias.toFixed(2)}`}
          size={24}
          onChange={onBiasChange}
        />
      </div>
      <PortSection>
        {mkPort({
          id: "wavefolder-audio-in",
          label: "audio in",
          type: "input",
        })}
        {mkPort({
          id: "wavefolder-audio-out",
          label: "audio out",
          type: "output",
        })}
      </PortSection>
    </ModuleFrontPanel>
  )
}
