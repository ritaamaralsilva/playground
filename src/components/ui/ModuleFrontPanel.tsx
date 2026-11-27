import type { CSSProperties, ReactNode } from "react"

export type ModuleTone =
  | "clock"
  | "sequencer"
  | "envelope"
  | "lfo"
  | "oscillator"
  | "filter"
  | "vca"
  | "reverb"
  | "delay"
  | "output"
  | "noise"
  | "ringmod"
  | "samplehold"
  | "wavefolder"
  | "attenuverter"
  | "harmonic"
  | "channelmixer"
  | "granular"
  | "spectralphaser"

export function ModuleFrontPanel({
  title,
  width,
  tone,
  children,
}: {
  title: string
  width: number
  tone: ModuleTone
  children: ReactNode
}) {
  return (
    <div
      className="module-panel flex flex-col flex-shrink-0"
      data-tone={tone}
      style={{
        width,
        position: "relative",
        zIndex: 10,
      }}
    >
      <span
        aria-hidden="true"
        className="module-panel__screw module-panel__screw--top-left"
      />
      <span
        aria-hidden="true"
        className="module-panel__screw module-panel__screw--top-right"
      />
      <span
        aria-hidden="true"
        className="module-panel__screw module-panel__screw--bottom-left"
      />
      <span
        aria-hidden="true"
        className="module-panel__screw module-panel__screw--bottom-right"
      />
      <div className="module-panel__header">
        <span className="module-panel__title">{title}</span>
      </div>
      <div className="module-panel__content">{children}</div>
    </div>
  )
}

export function PortSection({
  children,
  style,
}: {
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <div
      className="module-port-section"
      style={{
        width: "calc(100% - 10px)",
        marginTop: "auto",
        marginBottom: "8px",
        padding: "8px 7px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  )
}
