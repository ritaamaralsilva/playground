import React from "react"
import { Knob } from "../ui/Knob"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import type { PortDef } from "../engine/types"

interface DelayModuleProps {
  delayTime: number
  delayFb: number
  delayMix: number
  pingPong: boolean
  ppDivision: number
  ppDelayTime: number
  bpm: number
  clocked: boolean
  onPpDivisionChange: (d: number) => void
  onTimeChange: (v: number) => void
  onFbChange: (v: number) => void
  onMixChange: (v: number) => void
  onPingPongToggle: (value: boolean) => void
  mkPort: (def: PortDef) => React.ReactNode
}

export function DelayModule({
  delayTime,
  delayFb,
  delayMix,
  pingPong,
  ppDivision,
  ppDelayTime,
  bpm,
  clocked,
  onPpDivisionChange,
  onTimeChange,
  onFbChange,
  onMixChange,
  onPingPongToggle,
  mkPort,
}: DelayModuleProps) {
  return (
    <ModuleFrontPanel title="delay" width={135} tone="delay">
      {/* Mode toggle */}
      <div className="flex gap-1 w-full">
        <button
          onClick={() => onPingPongToggle(false)}
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "7px",
            textTransform: "uppercase",
            padding: "2px 8px",
            borderRadius: "3px",
            cursor: "pointer",
            flex: 1,
            background: !pingPong
              ? "color-mix(in srgb, var(--module-accent) 16%, var(--surface))"
              : "var(--surface-raised)",
            color: !pingPong ? "var(--module-accent)" : "var(--muted)",
            border: !pingPong
              ? "1px solid color-mix(in srgb, var(--module-accent) 48%, var(--line))"
              : "1px solid var(--line)",
          }}
        >
          basic
        </button>
        <button
          onClick={() => onPingPongToggle(true)}
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "7px",
            textTransform: "uppercase",
            padding: "2px 8px",
            borderRadius: "3px",
            cursor: "pointer",
            flex: 1,
            background: pingPong
              ? "color-mix(in srgb, var(--module-accent) 16%, var(--surface))"
              : "var(--surface-raised)",
            color: pingPong ? "var(--module-accent)" : "var(--muted)",
            border: pingPong
              ? "1px solid color-mix(in srgb, var(--module-accent) 48%, var(--line))"
              : "1px solid var(--line)",
          }}
        >
          ping pong
        </button>
      </div>

      {/* Ping pong division selector */}
      {pingPong && (
        <div className="flex flex-col gap-1 w-full px-2">
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "8px",
              color: "var(--muted)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            division
          </span>
          <div className="flex flex-wrap gap-0.5">
            {([1, 2, 3, 4, 6, 8, 16] as const).map((d) => (
              <button
                key={d}
                onClick={() => onPpDivisionChange(d)}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "8px",
                  padding: "2px 5px",
                  borderRadius: "3px",
                  cursor: "pointer",
                  background:
                    ppDivision === d
                      ? "color-mix(in srgb, var(--module-accent) 16%, var(--surface))"
                      : "var(--surface-raised)",
                  color:
                    ppDivision === d ? "var(--module-accent)" : "var(--muted)",
                  border:
                    ppDivision === d
                      ? "1px solid color-mix(in srgb, var(--module-accent) 48%, var(--line))"
                      : "1px solid var(--line)",
                }}
              >
                1/{d}
              </button>
            ))}
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "8px",
              color: "var(--module-accent)",
            }}
          >
            {(ppDelayTime * 1000).toFixed(0)}ms @ {Math.round(bpm)} bpm
          </span>
        </div>
      )}
      {!pingPong &&
        (clocked ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "8px",
              color: "var(--module-accent)",
            }}
          >
            {(60000 / bpm).toFixed(0)}ms @ {Math.round(bpm)} bpm
          </span>
        ) : (
          <Knob
            value={delayTime}
            min={0.01}
            max={2}
            label="time"
            sublabel={`${delayTime.toFixed(2)}s`}
            onChange={onTimeChange}
          />
        ))}

      <Knob
        value={delayFb}
        min={0}
        max={0.95}
        label="feedback"
        sublabel={`${delayFb.toFixed(2)}x`}
        onChange={onFbChange}
      />
      <Knob
        value={delayMix}
        min={0}
        max={1}
        label="mix"
        sublabel={delayMix.toFixed(2)}
        onChange={onMixChange}
      />
      <PortSection>
        {mkPort({ id: "delay-clock-in", label: "clk in", type: "input" })}
        {mkPort({ id: "delay-audio-in", label: "audio in", type: "input" })}
        {mkPort({ id: "delay-audio-out", label: "audio out", type: "output" })}
      </PortSection>
    </ModuleFrontPanel>
  )
}
