import React from "react"
import { AudioMeter } from "../ui/AudioMeter"
import { Knob } from "../ui/Knob"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import { formatGainDb } from "../engine/utils"
import type { PortDef, PortId } from "../engine/types"

interface ChannelMixerModuleProps {
  levels: number[]
  pans: number[]
  onLevelChange: (channel: number, level: number) => void
  onPanChange: (channel: number, pan: number) => void
  meters: Array<AnalyserNode | null>
  mkPort: (
    def: PortDef,
    orientation?: "horizontal" | "vertical",
  ) => React.ReactNode
}

const CHANNEL_INPUTS: PortId[] = [
  "channel-1-in",
  "channel-2-in",
  "channel-3-in",
  "channel-4-in",
  "channel-5-in",
  "channel-6-in",
  "channel-7-in",
  "channel-8-in",
]

export function ChannelMixerModule({
  levels,
  pans,
  onLevelChange,
  onPanChange,
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
            key={input}
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
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
              {mkPort({ id: input, label: "IN", type: "input" })}
            </div>
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
                width={34}
                height={76}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Knob
                  value={levels[index] ?? 0.75}
                  min={0}
                  max={1}
                  label="level"
                  sublabel={formatGainDb(levels[index] ?? 0.75)}
                  size={28}
                  onChange={(value) => onLevelChange(index, value)}
                />
                <Knob
                  value={pans[index] ?? 0}
                  min={-1}
                  max={1}
                  label="pan"
                  sublabel={
                    Math.abs(pans[index] ?? 0) < 0.01
                      ? "C"
                      : `${(pans[index] ?? 0) < 0 ? "L" : "R"}${Math.round(Math.abs(pans[index] ?? 0) * 100)}`
                  }
                  size={18}
                  onChange={(value) => onPanChange(index, value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <PortSection
        style={{
          width: "calc(100% - 14px)",
          alignItems: "center",
          padding: "6px 12px",
        }}
      >
        <span
          style={{
            color: "var(--module-accent)",
            fontFamily: "var(--font-sans)",
            fontSize: "8px",
            fontWeight: 700,
            letterSpacing: "0.12em",
          }}
        >
          STEREO MIX OUT
        </span>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            justifyItems: "center",
            gap: "16px",
            width: "100%",
          }}
        >
          {mkPort(
            { id: "channel-mixer-out-l", label: "L OUT", type: "output" },
            "vertical",
          )}
          {mkPort(
            { id: "channel-mixer-out-r", label: "R OUT", type: "output" },
            "vertical",
          )}
        </div>
      </PortSection>
    </ModuleFrontPanel>
  )
}
