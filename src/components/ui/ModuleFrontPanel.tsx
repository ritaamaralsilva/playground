import type { ReactNode } from "react"

export function ModuleFrontPanel({
  title,
  width,
  children,
}: {
  title: string
  width: number
  children: ReactNode
}) {
  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{
        width,
        background: "#000",
        border: "1px solid #1c1c1c",
        minHeight: 340,
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "10px 6px 8px",
          borderBottom: "1px solid #1e1e1e",
        }}
      >
        <span
          style={{
            fontFamily: "'Bebas Neue', 'Impact', sans-serif",
            fontSize: "22px",
            fontWeight: 700,
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
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          flex: 1,
          gap: "12px",
          padding: "16px 12px 0 8px",
          boxSizing: "border-box",
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
      style={{
        width: "100%",
        marginTop: "auto",
        borderTop: "1px solid #1a1a1a",
        padding: "8px 10px 10px 10px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  )
}
