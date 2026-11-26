import RackContainer from "@/components/eurorack/RackContainer"

export default function Page() {
  return (
    <main className="app-stage fixed inset-0 h-dvh w-full overflow-hidden flex items-center justify-center">
      <RackContainer />
    </main>
  )
}
