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

  // Aluminum ring colour — different for input vs output
  const ringColor = isOut ? "#8a8078" : "#6e6a65"

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
        className="rounded-full cursor-crosshair flex-shrink-0 flex items-center justify-center"
        style={{
          width: 16,
          height: 16,
          background: connected
            ? "#0a0a0a"
            : `radial-gradient(circle at 38% 30%, #3a3632, #1a1816)`,
          border: connected
            ? `2px solid ${cableColor}`
            : highlighted
            ? "2px solid #e8e2d4"
            : `2px solid ${ringColor}`,
          boxShadow: highlighted
            ? `0 0 6px rgba(232,226,212,0.5), inset 0 1px 2px rgba(0,0,0,0.8)`
            : connected
            ? `0 0 5px ${cableColor}66, inset 0 1px 2px rgba(0,0,0,0.8)`
            : `0 1px 3px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)`,
          opacity: dragging && !highlighted && !connected ? 0.3 : 1,
          transition: "border-color 0.1s, box-shadow 0.1s",
        }}
      >
        <div
          className="rounded-full"
          style={{
            width: 7,
            height: 7,
            background: connected ? cableColor : "#000",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.9)",
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "'DM Mono', 'Courier New', monospace",
          fontSize: "7px",
          fontWeight: 400,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: connected ? "#b0a898" : "#6e6860",
          lineHeight: 1,
          maxWidth: 48,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {def.label}
      </span>
    </div>
  )
}
