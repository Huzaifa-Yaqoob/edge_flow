// workers/pdf.worker.ts
import init, {
  initial_sanitize_and_get_sensitive_data,
} from "@workspace/core-wasm/pkg"

self.onmessage = async (e: MessageEvent) => {
  const { bytes } = e.data

  try {
    await init()
  } catch (error: any) {
    const message = String(error?.message ?? error ?? "")
    const match = message.match(/Failed to parse URL from\s+(\S+)/)
    if (!match?.[1]) throw error
    await init(new URL(match[1], self.location.origin).toString())
  }

  try {
    const result = initial_sanitize_and_get_sensitive_data(bytes)
    self.postMessage({ type: "SUCCESS", result })
  } catch (error) {
    self.postMessage({ type: "ERROR", error: error?.toString() })
  }
}
