import type { Metadata } from "next"
import "./global.css"

export const metadata: Metadata = {
  title: "Playground by Rita Silva",
  description: "Interactive modular synthesizer by Rita Silva.",
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
