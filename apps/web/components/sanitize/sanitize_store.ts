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
