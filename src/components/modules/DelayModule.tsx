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
  onPpDivisionChange,
  onTimeChange,
  onFbChange,
  onMixChange,
  onPingPongToggle,
  mkPort,
}: DelayModuleProps) {
  return (
    <ModuleFrontPanel title="delay" width={140} color="#1a1a1c">
      {/* Mode toggle */}
      <div className="flex gap-1 w-full">
        <button
          onClick={() => onPingPongToggle(false)}
          className="text-[7px] font-mono uppercase px-2 py-0.5 rounded transition-all flex-1"
          style={{
            background: !pingPong ? "#1a1a3a" : "#141414",
            color: !pingPong ? "#4e9eff" : "#444",
            border: !pingPong ? "1px solid #2a2a6a" : "1px solid #222",
          }}
        >
          basic
        </button>
        <button
          onClick={() => onPingPongToggle(true)}
          className="text-[7px] font-mono uppercase px-2 py-0.5 rounded transition-all flex-1"
          style={{
            background: pingPong ? "#1a1a3a" : "#141414",
            color: pingPong ? "#4e9eff" : "#444",
            border: pingPong ? "1px solid #2a2a6a" : "1px solid #222",
          }}
        >
          ping pong
        </button>
      </div>

      {/* Ping pong division selector */}
      {pingPong && (
        <div className="flex flex-col gap-0.5 w-full">
          <span className="text-[7px] font-mono text-zinc-600 uppercase tracking-wider">
            division
          </span>
          <div className="flex flex-wrap gap-0.5">
            {([1, 2, 3, 4, 6, 8, 16] as const).map((d) => (
              <button
                key={d}
                onClick={() => onPpDivisionChange(d)}
                className="text-[7px] font-mono px-1.5 py-0.5 rounded transition-all"
                style={{
                  background: ppDivision === d ? "#1a1a3a" : "#141414",
                  color: ppDivision === d ? "#4e9eff" : "#444",
                  border:
                    ppDivision === d ? "1px solid #2a2a6a" : "1px solid #222",
                }}
              >
                1/{d}
              </button>
            ))}
          </div>
          <span className="text-[8px] font-mono" style={{ color: "#556" }}>
            {(ppDelayTime * 1000).toFixed(0)}ms @ {Math.round(bpm)} bpm
          </span>
        </div>
      )}
      {/* Basic mode: free time knob */}
      {!pingPong && (
        <Knob
          value={delayTime}
          min={0.01}
          max={2}
          label="time"
          sublabel={`${delayTime.toFixed(2)}s`}
          onChange={onTimeChange}
        />
      )}

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
