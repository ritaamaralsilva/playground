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
    <ModuleFrontPanel title="clock" width={110}>
      <div className="flex flex-col items-center gap-2 w-full">
        <DigitalDisplay value={`${Math.round(bpm)} bpm`} width={88} />
        <div
          className="w-2 h-2 rounded-full mt-1 transition-all duration-75"
          style={{
            background: clockBeat ? "#f5a623" : "#0e0900",
            boxShadow: clockBeat ? "0 0 5px #f5a623" : "none",
          }}
        />

        <div className="w-full flex justify-center">
          <Knob
            value={bpm}
            min={30}
            max={300}
            label="bpm"
            sublabel={`${Math.round(bpm)}`}
            onChange={onBpmChange}
          />
        </div>
      </div>

      <PortSection>
        {mkPort({ id: "clock-out", label: "out", type: "output" })}
      </PortSection>
    </ModuleFrontPanel>
  )
}
