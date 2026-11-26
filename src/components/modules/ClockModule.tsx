import { Knob } from "../ui/Knob"
import { DigitalDisplay } from "../ui/DigitalDisplay"
import { ModuleFrontPanel, PortSection } from "../ui/ModuleFrontPanel"
import type { PortDef } from "../engine/types"

interface ClockModuleProps {
  bpm: number
  clockBeat: boolean
  onBpmChange: (v: number) => void
  mkPort: (def: PortDef) => React.ReactNode
}

export function ClockModule({
  bpm,
  clockBeat,
  onBpmChange,
  mkPort,
}: ClockModuleProps) {
  return (
    <ModuleFrontPanel title="clock" width={110} tone="clock">
      <div className="flex flex-col items-center gap-1">
        <DigitalDisplay value={`${Math.round(bpm)} bpm`} width={88} />
        <div
          className="w-2 h-2 rounded-full mt-1 transition-all duration-75"
          style={{
            background: clockBeat
              ? "var(--module-accent)"
              : "color-mix(in srgb, var(--module-accent) 16%, var(--surface))",
            boxShadow: clockBeat
              ? "0 0 8px color-mix(in srgb, var(--module-accent) 45%, transparent)"
              : "none",
          }}
        />
      </div>
      <Knob
        value={bpm}
        min={30}
        max={300}
        label="bpm"
        sublabel={`${Math.round(bpm)}`}
        onChange={onBpmChange}
      />

      <PortSection>
        {mkPort({ id: "clock-out", label: "out", type: "output" })}
      </PortSection>
    </ModuleFrontPanel>
  )
}
