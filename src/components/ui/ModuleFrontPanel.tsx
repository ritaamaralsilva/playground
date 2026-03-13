import type { ReactNode } from "react"

export function ModuleFrontPanel({
  title,
  width,
  color = "#000",
  children,
}: {
  title: string
  width: number
  color?: string
  children: ReactNode
}) {
  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{
        width,
        background: color,
        border: "1px solid #1c1c1c",
        minHeight: 340,
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* Title bar */}
      <div
        className="flex flex-col items-center"
        style={{
          padding: "10px 6px 8px",
          borderBottom: "1px solid #1e1e1e",
        }}
      >
        <span
          style={{
            fontFamily: "'Bebas Neue', 'Impact', sans-serif",
            fontSize: "22px",
            fontWeight: 400,
            letterSpacing: "0.12em",
            color: "#e8e2d4",
            lineHeight: 1,
            textTransform: "uppercase",
          }}
        >
          {title}
        </span>
      </div>

      {/* Content — centered vertically */}
      <div
        className="flex flex-col items-center justify-start w-full flex-1"
        style={{
          gap: "12px",
          padding: "16px 10px 0 10px",
          alignItems: "center",
        }}
      >
        {children}
      </div>
    </div>
  )
}

export function PortSection({ children }: { children: ReactNode }) {
  return (
    <div
      className="w-full grid"
      style={{
        marginTop: "auto",
        borderTop: "1px solid #1a1a1a",
        padding: "8px 8px 10px",
        gap: "6px",
        gridTemplateColumns: "1fr 1fr",
        alignItems: "center",
      }}
    >
      {children}
    </div>
  )
}
