import RackContainer from "@/components/eurorack/RackContainer"

export default function Page() {
  return (
    <main className="fixed inset-0 h-dvh w-full overflow-hidden bg-[#080808] flex items-center justify-center">
      <RackContainer />
    </main>
  )
}
