"use client"

import { useRef, useCallback } from "react"

export interface KnobProps {
  value: number
  min: number
  max: number
  label: string
  sublabel: string
  size?: number
  onChange: (v: number) => void
}

export function Knob({
  value,
  min,
  max,
  label,
  sublabel,
  size = 32,
  onChange,
}: KnobProps) {
  const startY = useRef<number | null>(null)
  const startVal = useRef(value)
  const pct = (value - min) / (max - min)
  const deg = pct * 270 - 135

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startY.current = e.clientY
      startVal.current = value
      const onMove = (ev: MouseEvent) => {
        if (startY.current === null) return
        const delta = ((startY.current - ev.clientY) / 140) * (max - min)
        onChange(Math.max(min, Math.min(max, startVal.current + delta)))
      }
      const onUp = () => {
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup", onUp)
      }
      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup", onUp)
    },
    [value, min, max, onChange]
  )

  return (
    <div
      className="flex flex-col items-center"
      style={{ minWidth: size + 6, gap: "4px" }}
    >
      {/* Label above knob */}
      <span
        style={{
          fontFamily: "'DM Mono', 'Courier New', monospace",
          fontSize: "8px",
          fontWeight: 500,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#c8c0b0",
          lineHeight: 1,
        }}
      >
        {label}
      </span>

      {/* Knob body */}
      <div
        className="relative rounded-full cursor-pointer select-none flex-shrink-0"
        style={{
          width: size,
          height: size,
          // Cream/off-white aluminum finish — subtle radial gradient
          background: `
            radial-gradient(circle at 36% 30%,
              #f0ece4 0%,
              #ddd8ce 45%,
              #b8b3aa 100%
            )
          `,
          border: "1.5px solid #8a8580",
          boxShadow: `
            0 4px 10px rgba(0,0,0,0.95),
            0 1px 0 rgba(255,255,255,0.15) inset,
            0 -1px 0 rgba(0,0,0,0.4) inset
          `,
          transform: `rotate(${deg}deg)`,
        }}
        onMouseDown={onMouseDown}
      >
        {/* Position indicator dot */}
        <div
          className="absolute rounded-full"
          style={{
            width: 3.5,
            height: 3.5,
            background: "#1a1510",
            top: 6,
            left: "50%",
            transform: "translateX(-50%)",
            boxShadow: "0 0 0 0.5px rgba(0,0,0,0.6)",
          }}
        />
      </div>

      {/* Value sublabel below */}
      <span
        style={{
          fontFamily: "'DM Mono', 'Courier New', monospace",
          fontSize: "7px",
          fontWeight: 400,
          letterSpacing: "0.08em",
          color: "#7a6a50",
          lineHeight: 1,
        }}
      >
        {sublabel}
      </span>
    </div>
  )
}
