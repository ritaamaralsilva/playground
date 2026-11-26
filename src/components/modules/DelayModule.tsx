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
    <ModuleFrontPanel title="delay" width={135}>
      {/* Mode toggle */}
      <div className="flex gap-1 w-full">
        <button
          onClick={() => onPingPongToggle(false)}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "7px",
            textTransform: "uppercase",
            padding: "2px 8px",
            borderRadius: "3px",
            cursor: "pointer",
            flex: 1,
            background: !pingPong ? "#1c1000" : "#080808",
            color: !pingPong ? "#f5a623" : "#4a4440",
            border: !pingPong ? "1px solid #5a3800" : "1px solid #1a1a1a",
          }}
        >
          basic
        </button>
        <button
          onClick={() => onPingPongToggle(true)}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "7px",
            textTransform: "uppercase",
            padding: "2px 8px",
            borderRadius: "3px",
            cursor: "pointer",
            flex: 1,
            background: pingPong ? "#1c1000" : "#080808",
            color: pingPong ? "#f5a623" : "#4a4440",
            border: pingPong ? "1px solid #5a3800" : "1px solid #1a1a1a",
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
              fontFamily: "'DM Mono', 'Courier New', monospace",
              fontSize: "8px",
              color: "#6e6860",
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
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "8px",
                  padding: "2px 5px",
                  borderRadius: "3px",
                  cursor: "pointer",
                  background: ppDivision === d ? "#1c1000" : "#080808",
                  color: ppDivision === d ? "#f5a623" : "#4a4440",
                  border:
                    ppDivision === d
                      ? "1px solid #5a3800"
                      : "1px solid #1a1a1a",
                }}
              >
                1/{d}
              </button>
            ))}
          </div>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "8px",
              color: "#6a5030",
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
              fontFamily: "'DM Mono', monospace",
              fontSize: "8px",
              color: "#6a5030",
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
        sublabel={`${Math.round(delayFb * 100)}%`}
        onChange={onFbChange}
      />
      <Knob
        value={delayMix}
        min={0}
        max={1}
        label="mix"
        sublabel={`${Math.round(delayMix * 100)}%`}
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
