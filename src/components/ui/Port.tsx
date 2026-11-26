"use client"

import type { PortDef, PortId } from "../engine/types"

export interface PortProps {
  def: PortDef
  connected: boolean
  cableColor?: string
  highlighted: boolean
  dragging: boolean
  onRef: (id: PortId, el: HTMLDivElement | null) => void
  onClick: (id: PortId) => void
}

export function Port({
  def,
  connected,
  cableColor,
  highlighted,
  dragging,
  onRef,
  onClick,
}: PortProps) {
  const isOut = def.type === "output"

  const activeColor = cableColor ?? "var(--module-accent)"

  return (
    <div
      className="flex items-center"
      style={{
        justifyContent: isOut ? "flex-end" : "flex-start",
        gap: "5px",
      }}
    >
      {/* Jack socket */}
      <div
        ref={(el) => onRef(def.id, el)}
        data-port={def.id}
        data-porttype={def.type}
        onClick={() => onClick(def.id)}
        className="rounded-full cursor-pointer flex-shrink-0 flex items-center justify-center"
        style={{
          width: 14,
          height: 14,
          background:
            "radial-gradient(circle, #151a1e 0 28%, #717c84 31% 43%, #d2d8dc 48% 62%, #59636b 68% 100%)",
          border: connected
            ? `2px solid ${activeColor}`
            : highlighted
            ? "2px solid var(--module-accent)"
            : "1px solid #30383f",
          boxShadow: highlighted
            ? `0 0 7px color-mix(in srgb, var(--module-accent) 55%, transparent), inset 0 1px 2px rgb(0 0 0 / 45%)`
            : connected
            ? `0 0 5px ${activeColor}88, inset 0 1px 2px rgb(0 0 0 / 45%)`
            : "0 1px 2px rgb(0 0 0 / 40%), inset 0 1px 0 rgb(255 255 255 / 55%)",
          opacity: dragging && !highlighted && !connected ? 0.3 : 1,
          transition: "border-color 0.1s, box-shadow 0.1s",
        }}
      >
        <div
          className="rounded-full"
          style={{
            width: 5,
            height: 5,
            background: connected ? activeColor : "#11161a",
            border: "1px solid #77828a",
            boxShadow: connected
              ? `0 0 4px ${activeColor}`
              : "inset 0 1px 2px rgb(0 0 0 / 80%)",
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "7px",
          fontWeight: 500,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          color: connected ? "var(--ink)" : "var(--muted)",
          lineHeight: 1,
          maxWidth: 44,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {def.label}
      </span>
    </div>
  )
}
