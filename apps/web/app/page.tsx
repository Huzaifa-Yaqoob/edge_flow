import { ToolCards } from "../components/ToolCards";

export default function Page() {
  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-5xl font-bold mb-4">Edge Flow</h1>
      <p className="text-lg text-center max-w-2xl">
        Totally private and local tools to modify data. Your data will never leave your system.
      </p>
      <ToolCards />
    </div>
  )
}
