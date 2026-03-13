export type PortId =
  | "clock-out"
  | "seq-clock-in"
  | "seq-cv-out"
  | "seq-gate-out"
  | "adsr-gate-in"
  | "adsr-env-out"
  | "lfo-out"
  | "osc-voct-in"
  | "osc-fm-in"
  | "osc-out"
  | "filter-audio-in"
  | "filter-cv-in"
  | "filter-audio-out"
  | "vca-cv-in"
  | "vca-audio-in"
  | "vca-out"
  | "reverb-audio-in"
  | "reverb-audio-out"
  | "delay-clock-in"
  | "delay-audio-in"
  | "delay-audio-out"
  | "out-in"

export type PortType = "output" | "input"

export interface PortDef {
  id: PortId
  label: string
  type: PortType
}
export interface Cable {
  from: PortId
  to: PortId
  color: string
}
export interface Point {
  x: number
  y: number
}
