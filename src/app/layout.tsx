import type { Metadata, Viewport } from "next"
import { Barlow_Condensed, IBM_Plex_Mono, Righteous } from "next/font/google"
import "./global.css"

const barlowCondensed = Barlow_Condensed({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
})

const righteous = Righteous({
  variable: "--font-title",
  subsets: ["latin"],
  weight: "400",
})

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
    <html
      lang="en"
      className={`${barlowCondensed.variable} ${ibmPlexMono.variable} ${righteous.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
