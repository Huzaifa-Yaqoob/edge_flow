// workers/media.worker.ts
import init, {
  initial_sanitize_and_get_sensitive_data,
  sanitize_pdf,
  init_panic_hook,
} from "@workspace/core-wasm/pkg"

// 1. Initialize the Panic Hook immediately so we get Rust errors in the console
let wasmInitialized = false

const ensureWasm = async () => {
  if (!wasmInitialized) {
    await init()
    init_panic_hook() // Captures Rust panics and sends them to JS console
    wasmInitialized = true
  }
}

// 2. The Main Event Listener
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data

  try {
    await ensureWasm()

    switch (type) {
      case "PDF_INITIAL_SCAN": {
        // payload would be the Uint8Array of the file
        const result = initial_sanitize_and_get_sensitive_data(payload)
        self.postMessage({ type: "SUCCESS", result })
        break
      }

      case "PDF_ONLY_SANITIZE": {
        const cleanBytes = sanitize_pdf(payload)
        self.postMessage({ type: "SUCCESS", result: cleanBytes })
        break
      }

      // --- FUTURE SLOTS ---
      case "IMAGE_RESIZE":
        // In the future, you'll call: image::process::resize(payload)
        break

      case "VIDEO_EXTRACT_FRAME":
        // In the future: video::tools::get_frame(payload)
        break

      default:
        throw new Error(`Unknown task type: ${type}`)
    }
  } catch (error: any) {
    // Send the error back to the Manager so it can reject the Promise
    self.postMessage({ type: "ERROR", error: error.toString() })
  }
}
