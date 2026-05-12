// workers/media.worker.ts
import init, {
  initial_sanitize_and_get_sensitive_data,
  redact_pdf,
  sanitize_pdf,
  wasm_generate_bundle, // Added wasm_generate_bundle
  init_panic_hook,
} from "@workspace/core-wasm/pkg"

// Removed the direct import of the .wasm file.
// The `init()` function from @workspace/core-wasm/pkg should handle loading its associated .wasm file.

// 1. Initialize the Panic Hook immediately so we get Rust errors in the console
let wasmInitialized = false

const ensureWasm = async () => {
  if (!wasmInitialized) {
    try {
      await init()
    } catch (error: any) {
      const message = String(error?.message ?? error ?? "")
      const match = message.match(/Failed to parse URL from\s+(\S+)/)

      if (!match?.[1]) throw error

      // Retry with absolute URL for worker fetch().
      const absoluteWasmUrl = new URL(match[1], self.location.origin).toString()
      await init(absoluteWasmUrl)
    }
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
        self.postMessage({ type: "SUCCESS", result, action: type }) // Added action for store
        break
      }

      case "PDF_ONLY_SANITIZE": {
        const cleanBytes = sanitize_pdf(payload)
        self.postMessage({ type: "SUCCESS", result: cleanBytes, action: type }) // Added action for store
        break
      }

      case "PDF_REDACT": {
        const { fileBits, redactions } = payload
        const redactedBytes = redact_pdf(fileBits, redactions)
        self.postMessage({
          type: "SUCCESS",
          result: redactedBytes,
          action: type,
        })
        break
      }

      case "IMAGE_OPTIMIZE": {
        const { fileBits, quality } = payload
        const optimizedImage = wasm_generate_bundle(fileBits, quality)
        self.postMessage({
          type: "SUCCESS",
          result: optimizedImage,
          action: type,
        })
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
