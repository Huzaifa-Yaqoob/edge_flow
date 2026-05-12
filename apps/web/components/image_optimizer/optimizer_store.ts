// apps/web/components/image_optimizer/optimizer_store.ts
import { create } from "zustand"

interface OriginalImage {
  id: string
  file: File
  previewUrl: string
}

interface OptimizedImage {
  id: string
  originalId: string
  dataUrl: string
  originalSize: number
  optimizedSize: number
  fileName: string
  sizeLabel: string
  width: number
}

interface OptimizerState {
  originalImages: OriginalImage[]
  optimizedImages: OptimizedImage[]
  quality: number
  isOptimizing: boolean
  error: string | null
  worker: Worker | null
  addImages: (files: FileList) => void
  setQuality: (quality: number) => void
  optimizeImages: () => Promise<void>
  clearImages: () => void
  initializeWorker: () => void
}

export const useOptimizerStore = create<OptimizerState>((set, get) => ({
  originalImages: [],
  optimizedImages: [],
  quality: 80, // Default quality
  isOptimizing: false,
  error: null,
  worker: null,

  initializeWorker: () => {
    // Ensure worker is only initialized on the client side
    if (typeof window !== "undefined" && !get().worker) {
      const worker = new Worker(
        new URL("../../worker/media.worker.ts", import.meta.url)
      )
      worker.onmessage = (e: MessageEvent) => {
        console.log("Message from worker:", e.data) // Log worker's return
        const {
          type,
          result,
          action,
          error,
          originalId,
          fileName,
          originalSize,
        } = e.data // Destructure originalId, fileName, originalSize from e.data
        if (action === "IMAGE_OPTIMIZE") {
          if (type === "SUCCESS") {
            const assets = Array.isArray(result) ? result : []
            set((state) => {
              const newOptimizedImages: OptimizedImage[] = assets
                .filter((asset) => asset?.data)
                .map((asset) => {
                  const data =
                    asset.data instanceof Uint8Array
                      ? asset.data
                      : new Uint8Array(asset.data)
                  const dataUrl = URL.createObjectURL(
                    new Blob([data], { type: "image/webp" })
                  )
                  return {
                    id: crypto.randomUUID(),
                    originalId,
                    dataUrl,
                    originalSize,
                    optimizedSize: data.byteLength,
                    fileName,
                    sizeLabel: asset.size_label ?? "unknown",
                    width: asset.width ?? 0,
                  }
                })

              return {
                optimizedImages: [
                  ...state.optimizedImages,
                  ...newOptimizedImages,
                ],
              }
            })
          } else if (type === "ERROR") {
            set({ error: error.toString() })
          }
        }
      }
      set({ worker })
    }
  },

  addImages: (files: FileList) => {
    const newImages: OriginalImage[] = Array.from(files)
      .filter((file) => file.type === "image/jpeg" || file.type === "image/png")
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      }))
    set((state) => ({
      originalImages: [...state.originalImages, ...newImages],
      error: null,
    }))
  },

  setQuality: (quality: number) => {
    set({ quality })
  },

  optimizeImages: async () => {
    let { originalImages, quality, worker } = get()
    if (!worker) {
      get().initializeWorker()
      worker = get().worker
    }
    if (!worker) {
      set({ error: "Worker not initialized." })
      return
    }
    if (originalImages.length === 0) {
      set({ error: "No images to optimize." })
      return
    }

    set({ isOptimizing: true, optimizedImages: [], error: null })

    // Track pending optimizations
    let pendingOptimizations = originalImages.length

    const handleWorkerMessage = (e: MessageEvent) => {
      const { type, action, originalId } = e.data
      if (action === "IMAGE_OPTIMIZE" && originalId) {
        pendingOptimizations--
        if (pendingOptimizations === 0) {
          set({ isOptimizing: false })
          worker.removeEventListener("message", handleWorkerMessage) // Clean up listener
        }
      }
    }

    worker.addEventListener("message", handleWorkerMessage)

    for (const originalImage of originalImages) {
      try {
        const arrayBuffer = await originalImage.file.arrayBuffer()
        const fileBits = new Uint8Array(arrayBuffer)

        // Post message to worker for optimization
        worker.postMessage(
          {
            type: "IMAGE_OPTIMIZE",
            payload: {
              fileBits,
              quality,
              originalId: originalImage.id,
              fileName: originalImage.file.name,
              originalSize: originalImage.file.size,
            },
          },
          [fileBits.buffer]
        ) // Transferable object
      } catch (err: any) {
        set({
          error: `Failed to read image ${originalImage.file.name}: ${err.message}`,
        })
        pendingOptimizations-- // Decrement even on error
        if (pendingOptimizations === 0) {
          set({ isOptimizing: false })
          worker.removeEventListener("message", handleWorkerMessage)
        }
      }
    }
  },

  clearImages: () => {
    get().originalImages.forEach((img) => URL.revokeObjectURL(img.previewUrl))
    get().optimizedImages.forEach((img) => URL.revokeObjectURL(img.dataUrl))
    set({ originalImages: [], optimizedImages: [], error: null })
  },
}))

// Removed the immediate call to initializeWorker()
// useOptimizerStore.getState().initializeWorker();
