export function DigitalDisplay({
  value,
  width = 80,
}: {
  value: string
  width?: number
}) {
  return (
    <div
      className="flex items-center justify-center rounded font-dm-mono"
      style={{
        width,
        height: 22,
        background: "#0e0900",
        border: "1px solid #3a2800",
        color: "#f5a623",
        letterSpacing: "0.1em",
        fontSize: 10,
      }}
    >
      {value}
    </div>
  )
}
