// workers/pdf.worker.ts
import init, {
  initial_sanitize_and_get_sensitive_data,
} from "@workspace/core-wasm/pkg"

self.onmessage = async (e: MessageEvent) => {
  const { bytes } = e.data

  // Initialize inside the worker thread
  await init()

  try {
    const result = initial_sanitize_and_get_sensitive_data(bytes)
    self.postMessage({ type: "SUCCESS", result })
  } catch (error) {
    self.postMessage({ type: "ERROR", error: error?.toString() })
  }
}
