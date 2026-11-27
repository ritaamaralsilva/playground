"use client"

import { useRef, useCallback } from "react"

export interface KnobProps {
  value: number
  min: number
  max: number
  label: string
  sublabel: string
  size?: number
  scale?: "linear" | "log"
  onChange: (v: number) => void
}

export function Knob({
  value,
  min,
  max,
  label,
  sublabel,
  size = 32,
  scale = "linear",
  onChange,
}: KnobProps) {
  const startY = useRef<number | null>(null)
  const startVal = useRef(value)
  const startScale = useRef(1)
  const isLogarithmic = scale === "log" && min > 0 && max > min
  const pct = isLogarithmic
    ? Math.log(value / min) / Math.log(max / min)
    : (value - min) / (max - min)
  const deg = pct * 270 - 135

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      startY.current = e.clientY
      startVal.current = value
      const control = e.currentTarget.parentElement
      const bounds = control?.getBoundingClientRect()
      startScale.current =
        bounds && control?.offsetWidth ? bounds.width / control.offsetWidth : 1
    },
    [value],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (startY.current === null) return
      const progressDelta =
        (startY.current - e.clientY) /
        (140 * Math.max(startScale.current, 0.01))
      if (isLogarithmic) {
        const range = Math.log(max / min)
        const startProgress = Math.log(startVal.current / min) / range
        const nextProgress = Math.max(
          0,
          Math.min(1, startProgress + progressDelta),
        )
        onChange(min * Math.exp(nextProgress * range))
        return
      }

      const delta = progressDelta * (max - min)
      onChange(Math.max(min, Math.min(max, startVal.current + delta)))
    },
    [min, max, onChange, isLogarithmic],
  )

  return (
    <div
      className="flex flex-col items-center"
      style={{ minWidth: size + 20, gap: "6px" }}
    >
      {/* Label above knob */}
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "9px",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--ink)",
          lineHeight: 1,
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>

      {/* Knob body */}
      <div
        className="relative cursor-pointer select-none flex-shrink-0"
        style={{
          width: size,
          height: size,
          background: `
            radial-gradient(circle at 30% 23%, rgb(255 255 255 / 82%) 0 8%, transparent 30%),
            radial-gradient(circle at 72% 78%, color-mix(in srgb, var(--module-accent) 35%, #f29cca), transparent 58%),
            linear-gradient(
              145deg,
              color-mix(in srgb, var(--module-accent) 28%, #ffffff),
              var(--module-accent) 56%,
              color-mix(in srgb, var(--module-accent) 38%, #30223b)
            )
          `,
          border:
            "2px solid color-mix(in srgb, var(--module-accent) 62%, #ffffff)",
          borderRadius: "25% 75% 58% 42% / 62% 31% 69% 38%",
          touchAction: "none",
          boxShadow: `
            0 2px 3px rgb(31 28 42 / 35%),
            0 0 0 2px color-mix(in srgb, var(--module-accent) 25%, #f4e9ff),
            0 3px 9px color-mix(in srgb, var(--module-accent) 48%, transparent),
            0 1px 2px rgb(255 255 255 / 72%) inset,
            0 -3px 4px rgb(43 24 59 / 34%) inset
          `,
          transform: `rotate(${deg}deg)`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          startY.current = null
        }}
        onPointerCancel={() => {
          startY.current = null
        }}
      >
        <div
          aria-hidden="true"
          className="absolute"
          style={{
            width: Math.max(6, size * 0.24),
            height: Math.max(3, size * 0.12),
            top: Math.max(4, size * 0.18),
            left: Math.max(6, size * 0.22),
            borderRadius: "60% 40% 55% 45%",
            background: "rgb(255 255 255 / 58%)",
            filter: "blur(0.4px)",
            pointerEvents: "none",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 2,
            height: Math.max(6, size * 0.25),
            borderRadius: 2,
            background: "#fff8ff",
            top: Math.max(4, size * 0.12),
            left: "50%",
            transform: "translateX(-50%)",
            boxShadow:
              "0 1px 2px rgb(37 22 50 / 70%), 0 0 4px rgb(255 255 255 / 60%)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Value sublabel below */}
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          fontWeight: 500,
          letterSpacing: "0.02em",
          color: "var(--module-accent)",
          lineHeight: 1,
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {sublabel}
      </span>
    </div>
  )
}
