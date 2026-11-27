import React from "react"
import { AudioMeter } from "../ui/AudioMeter"
import { Knob } from "../ui/Knob"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import { formatGainDb } from "../engine/utils"
import type { PortDef, PortId } from "../engine/types"

interface ChannelMixerModuleProps {
  levels: number[]
  onLevelChange: (channel: number, level: number) => void
  meters: Array<AnalyserNode | null>
  mkPort: (def: PortDef) => React.ReactNode
}

const CHANNEL_INPUTS: Array<{ id: PortId; label: string }> = [
  { id: "channel-1-in", label: "1" },
  { id: "channel-2-in", label: "2" },
  { id: "channel-3-in", label: "3" },
  { id: "channel-4-in", label: "4" },
  { id: "channel-5-in", label: "5" },
  { id: "channel-6-in", label: "6" },
  { id: "channel-7-in", label: "7" },
  { id: "channel-8-in", label: "8" },
]

export function ChannelMixerModule({
  levels,
  onLevelChange,
  meters,
  mkPort,
}: ChannelMixerModuleProps) {
  return (
    <ModuleFrontPanel title="8-channel mixer" width={440} tone="channelmixer">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          justifyItems: "center",
          gap: "8px",
          width: "100%",
        }}
      >
        {CHANNEL_INPUTS.map((input, index) => (
          <div
            key={input.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "5px",
              minWidth: 0,
              width: "100%",
              padding: "7px 4px 5px",
              boxSizing: "border-box",
              border:
                "1px solid color-mix(in srgb, var(--module-accent) 48%, white)",
              borderRadius: "10px 6px 9px 7px",
              background:
                "linear-gradient(155deg, color-mix(in srgb, var(--module-accent) 13%, white), color-mix(in srgb, var(--module-accent) 8%, #dce5dd))",
              boxShadow:
                "0 2px 4px rgb(34 45 38 / 12%), inset 0 1px 0 rgb(255 255 255 / 78%)",
            }}
          >
            <span
              style={{
                color: "var(--ink)",
                fontFamily: "var(--font-sans)",
                fontSize: "8px",
                fontWeight: 700,
                letterSpacing: "0.05em",
                padding: "2px 6px",
                borderRadius: "999px",
                background:
                  "color-mix(in srgb, var(--module-accent) 18%, white)",
              }}
            >
              CH {String(index + 1).padStart(2, "0")}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                width: "100%",
              }}
            >
              <AudioMeter
                analyser={meters[index] ?? null}
                label={`Channel ${index + 1} level`}
                width={36}
                height={68}
              />
              <Knob
                value={levels[index] ?? 0.75}
                min={0}
                max={1}
                label="level"
                sublabel={formatGainDb(levels[index] ?? 0.75)}
                size={28}
                onChange={(value) => onLevelChange(index, value)}
              />
            </div>
            {mkPort({
              id: input.id,
              label: input.label,
              type: "input",
            })}
          </div>
        ))}
      </div>
      <PortSection>
        {mkPort({ id: "channel-mixer-out", label: "mix out", type: "output" })}
      </PortSection>
    </ModuleFrontPanel>
  )
}
