export function DigitalDisplay({
  value,
  width = 80,
}: {
  value: string
  width?: number
}) {
  return (
    <div
      className="flex items-center justify-center rounded font-mono"
      style={{
        width,
        height: 22,
        borderRadius: 3,
        background: "#172027",
        border: "1px solid #505d66",
        color: "var(--module-accent)",
        letterSpacing: "0.04em",
        fontSize: 10,
        textShadow: "0 0 5px color-mix(in srgb, var(--module-accent) 55%, transparent)",
        boxShadow:
          "inset 0 1px 4px rgb(0 0 0 / 75%), 0 1px 0 rgb(255 255 255 / 28%)",
      }}
    >
      {value}
    </div>
  )
}
