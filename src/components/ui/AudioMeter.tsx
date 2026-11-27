"use client"

import { useEffect, useState } from "react"

const MIN_DB = -60
const MAX_DB = 6
const SEGMENT_LEVELS = Array.from(
  { length: 23 },
  (_, index) => MIN_DB + index * 3,
)

interface AudioMeterProps {
  analyser: AnalyserNode | null
  label: string
  width?: number
  height?: number
}

export function AudioMeter({
  analyser,
  label,
  width = 38,
  height = 112,
}: AudioMeterProps) {
  const [levelDb, setLevelDb] = useState(MIN_DB)
  const [clipping, setClipping] = useState(false)

  useEffect(() => {
    if (!analyser) return

    const samples = new Float32Array(analyser.fftSize)
    let frameId = 0
    let lastTime = 0
    let lastRender = 0
    let displayedDb = MIN_DB
    let clipUntil = 0

    const updateMeter = (time: number) => {
      analyser.getFloatTimeDomainData(samples)
      let peak = 0
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample))

      const currentDb =
        peak > 0 ? Math.max(MIN_DB, 20 * Math.log10(peak)) : MIN_DB
      if (currentDb > 0) clipUntil = time + 800

      const elapsed = lastTime > 0 ? (time - lastTime) / 1000 : 0
      displayedDb = Math.max(currentDb, displayedDb - 24 * elapsed)
      if (time - lastRender >= 33) {
        setLevelDb(displayedDb)
        setClipping(time < clipUntil)
        lastRender = time
      }

      lastTime = time
      frameId = requestAnimationFrame(updateMeter)
    }

    frameId = requestAnimationFrame(updateMeter)
    return () => cancelAnimationFrame(frameId)
  }, [analyser])

  const currentDb = analyser ? levelDb : MIN_DB
  const isClipping = analyser ? clipping : false
  const boundedDb = Math.max(MIN_DB, Math.min(MAX_DB, currentDb))
  const displayedValue =
    currentDb <= MIN_DB ? "-∞ dB" : `${currentDb.toFixed(1)} dB`

  return (
    <div
      style={{
        width,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "3px",
      }}
    >
      <div style={{ display: "flex", alignItems: "stretch", gap: "3px" }}>
        <div
          role="meter"
          aria-label={label}
          aria-valuemin={MIN_DB}
          aria-valuemax={MAX_DB}
          aria-valuenow={boundedDb}
          aria-valuetext={`${displayedValue}${isClipping ? ", clipping" : ""}`}
          style={{
            width: "13px",
            height,
            display: "flex",
            flexDirection: "column-reverse",
            gap: "2px",
            padding: "3px",
            boxSizing: "border-box",
            border: "1px solid #53615c",
            borderRadius: "4px",
            background: "linear-gradient(180deg, #25312c, #17221e)",
            boxShadow: "inset 0 1px 3px rgb(0 0 0 / 55%)",
          }}
        >
          {SEGMENT_LEVELS.map((segmentDb) => {
            const active = boundedDb > segmentDb
            const overZero = segmentDb >= 0 && currentDb > 0
            return (
              <span
                key={segmentDb}
                aria-hidden="true"
                style={{
                  minHeight: 0,
                  flex: "1 1 0",
                  borderRadius: "1px",
                  background: active
                    ? overZero
                      ? "#f04438"
                      : "#41d878"
                    : "rgb(141 163 151 / 20%)",
                  boxShadow:
                    active && overZero
                      ? "0 0 5px rgb(240 68 56 / 65%)"
                      : active
                        ? "0 0 4px rgb(65 216 120 / 48%)"
                        : "none",
                }}
              />
            )
          })}
        </div>
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            color: "var(--muted)",
            fontFamily: "var(--font-mono)",
            fontSize: "7px",
            lineHeight: 1,
          }}
        >
          <span>+6</span>
          <span style={{ color: currentDb > 0 ? "#d92d20" : undefined }}>
            0
          </span>
          <span>-18</span>
          <span>-36</span>
          <span>-60</span>
        </div>
      </div>
      <span
        style={{
          color: isClipping ? "#d92d20" : "var(--ink)",
          fontFamily: "var(--font-mono)",
          fontSize: "8px",
          fontWeight: isClipping ? 700 : 500,
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {displayedValue}
      </span>
      <span
        aria-hidden="true"
        style={{
          minHeight: "8px",
          color: "#d92d20",
          fontFamily: "var(--font-sans)",
          fontSize: "7px",
          fontWeight: 700,
          letterSpacing: "0.05em",
          lineHeight: 1,
        }}
      >
        {isClipping ? "CLIP" : ""}
      </span>
    </div>
  )
}
