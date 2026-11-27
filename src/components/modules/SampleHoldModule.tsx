import React from "react"
import { Knob } from "../ui/Knob"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import type { PortDef } from "../engine/types"

interface SampleHoldModuleProps {
  inputGain: number
  offset: number
  slew: number
  onInputGainChange: (inputGain: number) => void
  onOffsetChange: (offset: number) => void
  onSlewChange: (slew: number) => void
  mkPort: (
    def: PortDef,
    orientation?: "horizontal" | "vertical",
  ) => React.ReactNode
}

export function SampleHoldModule({
  inputGain,
  offset,
  slew,
  onInputGainChange,
  onOffsetChange,
  onSlewChange,
  mkPort,
}: SampleHoldModuleProps) {
  return (
    <ModuleFrontPanel title="S&H" width={85} tone="samplehold">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            gap: 18,
            width: "100%",
          }}
        >
          <Knob
            value={inputGain}
            min={0}
            max={2}
            label="input"
            sublabel={`${inputGain.toFixed(2)}x`}
            size={24}
            onChange={onInputGainChange}
          />
          <Knob
            value={offset}
            min={-1}
            max={1}
            label="offset"
            sublabel={`${offset >= 0 ? "+" : ""}${offset.toFixed(2)}`}
            size={24}
            onChange={onOffsetChange}
          />
          <Knob
            value={slew}
            min={0}
            max={0.5}
            label="slew"
            sublabel={`${Math.round(slew * 1000)} ms`}
            size={24}
            onChange={onSlewChange}
          />
        </div>
        <PortSection
          style={{
            alignItems: "center",
            padding: "6px 4px",
          }}
        >
          {mkPort(
            { id: "sample-cv-in", label: "signal in", type: "input" },
            "vertical",
          )}
          {mkPort(
            { id: "sample-clock-in", label: "clock in", type: "input" },
            "vertical",
          )}
          {mkPort(
            { id: "sample-cv-out", label: "cv out", type: "output" },
            "vertical",
          )}
        </PortSection>
      </div>
    </ModuleFrontPanel>
  )
}
