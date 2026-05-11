import { create } from "zustand"

// Define the Worker type for better TypeScript support
interface MediaWorker extends Worker {
  onmessage: ((this: MediaWorker, ev: MessageEvent) => any) | null
  onmessageerror: ((this: MediaWorker, ev: MessageEvent) => any) | null
}

interface SanitizeState {
  uploadedFile: File | null
  scanResult: any | null
  loading: boolean
  error: string | null
  worker: MediaWorker | null
  sanitizedBlob: Blob | null
  setUploadedFile: (file: File | null) => void
  startScan: (file: File) => Promise<void>
  sanitizePdf: () => Promise<void>
  initializeWorker: () => void
  terminateWorker: () => void
  resetState: () => void
}

const toUint8Array = (data: unknown): Uint8Array | null => {
  if (!data) return null
  if (data instanceof Uint8Array) return data
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  }
  if (Array.isArray(data)) return new Uint8Array(data)
  if (typeof data === "object") {
    const record = data as Record<string, unknown>
    const nested = record.data
    if (nested instanceof Uint8Array) return nested
    if (nested instanceof ArrayBuffer) return new Uint8Array(nested)
    if (Array.isArray(nested)) return new Uint8Array(nested)
  }
  return null
}

export const useSanitizeStore = create<SanitizeState>((set, get) => ({
  uploadedFile: null,
  scanResult: null,
  loading: false,
  error: null,
  worker: null,
  sanitizedBlob: null,

  setUploadedFile: (file) =>
    set({
      uploadedFile: file,
      scanResult: null,
      error: null,
      sanitizedBlob: null,
    }),

  initializeWorker: () => {
    if (!get().worker) {
      const newWorker = new Worker(
        new URL("../../worker/media.worker.ts", import.meta.url),
        {
          type: "module",
        }
      ) as MediaWorker

      newWorker.onmessage = (event: MessageEvent) => {
        const { type, result, error, action } = event.data
        if (type === "SUCCESS") {
          console.log("Worker success:", type)
          if (action === "PDF_ONLY_SANITIZE" && result instanceof Uint8Array) {
            // FIX: Create a new Uint8Array from the result to ensure it's backed by a standard ArrayBuffer
            const safeResultUint8Array = new Uint8Array(result)
            const blob = new Blob([safeResultUint8Array], {
              type: "application/pdf",
            })
            set({ sanitizedBlob: blob, loading: false, error: null })
          } else if (action === "PDF_INITIAL_SCAN") {
            const pdfBytes = toUint8Array(result?.pdf_data)
            if (!pdfBytes || pdfBytes.length === 0) {
              set({
                error: "Scan completed but produced invalid PDF byte data.",
                loading: false,
                scanResult: null,
              })
              return
            }

            set({
              scanResult: {
                ...result,
                pdf_data: new Uint8Array(pdfBytes),
              },
              loading: false,
              error: null,
            })
          } else {
            set({ scanResult: result, loading: false, error: null })
          }
        } else if (type === "ERROR") {
          console.error("Worker error:", error)
          set({ error: error, loading: false, scanResult: null })
        }
      }

      newWorker.onmessageerror = (event: MessageEvent) => {
        console.error("Worker message error:", event)
        set({
          error: "An unknown worker error occurred.",
          loading: false,
          scanResult: null,
        })
      }

      set({ worker: newWorker })
    }
  },

  terminateWorker: () => {
    const worker = get().worker
    if (worker) {
      worker.terminate()
      set({ worker: null })
    }
  },

  startScan: async (file: File) => {
    set({ loading: true, error: null, scanResult: null, uploadedFile: file })
    const worker = get().worker

    if (!worker) {
      set({ error: "Worker not initialized.", loading: false })
      return
    }

    try {
      const arrayBuffer = await file.arrayBuffer()
      // Create a new Uint8Array from the existing one to ensure it's backed by a standard ArrayBuffer
      const safeUint8Array = new Uint8Array(arrayBuffer)

      worker.postMessage({
        type: "PDF_INITIAL_SCAN",
        payload: safeUint8Array,
      })
    } catch (e: any) {
      console.error("Error reading file or posting to worker:", e)
      set({ error: `Failed to process file: ${e.message}`, loading: false })
    }
  },

  sanitizePdf: async () => {
    const { uploadedFile, worker } = get()
    if (!uploadedFile || !worker) return

    set({ loading: true, error: null })

    try {
      const arrayBuffer = await uploadedFile.arrayBuffer()
      // Create a new Uint8Array from the existing one to ensure it's backed by a standard ArrayBuffer
      const safeUint8Array = new Uint8Array(arrayBuffer)

      worker.postMessage({
        type: "PDF_ONLY_SANITIZE",
        payload: safeUint8Array,
      })
    } catch (e: any) {
      console.error("Error during sanitization:", e)
      set({ error: `Sanitization failed: ${e.message}`, loading: false })
    }
  },

  resetState: () =>
    set({
      uploadedFile: null,
      scanResult: null,
      loading: false,
      error: null,
      sanitizedBlob: null,
    }),
}))
