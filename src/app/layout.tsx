import type { Metadata, Viewport } from "next"
import "./global.css"

export const metadata: Metadata = {
  title: "Playground by Rita Silva",
  description: "Interactive modular synthesizer by Rita Silva.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
