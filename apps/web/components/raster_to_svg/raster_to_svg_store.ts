import { create } from "zustand"

interface RasterImage {
  file: File
  previewUrl: string
}

interface RasterToSvgState {
  rasterImage: RasterImage | null
  svgResult: string | null
  outputFileName: string | null
  iterations: number | null
  isConverting: boolean
  error: string | null
  worker: Worker | null
  initializeWorker: () => void
  setImage: (file: File) => void
  setIterations: (value: number | null) => void
  convertToSvg: () => Promise<void>
  clear: () => void
}

export const useRasterToSvgStore = create<RasterToSvgState>((set, get) => ({
  rasterImage: null,
  svgResult: null,
  outputFileName: null,
  iterations: null,
  isConverting: false,
  error: null,
  worker: null,

  initializeWorker: () => {
    if (typeof window !== "undefined" && !get().worker) {
      const worker = new Worker(
        new URL("../../worker/media.worker.ts", import.meta.url)
      )

      worker.onmessage = (e: MessageEvent) => {
        const { type, action, result, error, fileName } = e.data
        if (action !== "RASTER_TO_SVG") return

        if (type === "SUCCESS") {
          const svgFileName = String(fileName ?? "converted")
            .replace(/\.[^.]+$/, "")
            .concat(".svg")

          set({
            svgResult: String(result),
            outputFileName: svgFileName,
            isConverting: false,
            error: null,
          })
        } else {
          set({
            isConverting: false,
            error: String(error ?? "Failed to convert image to SVG."),
          })
        }
      }

      set({ worker })
    }
  },

  setImage: (file: File) => {
    const existing = get().rasterImage
    if (existing?.previewUrl) {
      URL.revokeObjectURL(existing.previewUrl)
    }

    set({
      rasterImage: {
        file,
        previewUrl: URL.createObjectURL(file),
      },
      svgResult: null,
      outputFileName: null,
      error: null,
    })
  },

  setIterations: (value: number | null) => {
    set({ iterations: value })
  },

  convertToSvg: async () => {
    let { worker, rasterImage, iterations } = get()

    if (!rasterImage) {
      set({ error: "Please upload an image first." })
      return
    }

    if (!worker) {
      get().initializeWorker()
      worker = get().worker
    }

    if (!worker) {
      set({ error: "Worker not initialized." })
      return
    }

    try {
      set({ isConverting: true, error: null, svgResult: null, outputFileName: null })
      const arrayBuffer = await rasterImage.file.arrayBuffer()
      const fileBits = new Uint8Array(arrayBuffer)

      worker.postMessage(
        {
          type: "RASTER_TO_SVG",
          payload: {
            fileBits,
            iterations,
            fileName: rasterImage.file.name,
          },
        },
        [fileBits.buffer]
      )
    } catch (err: any) {
      set({
        isConverting: false,
        error: `Failed to read image: ${String(err?.message ?? err)}`,
      })
    }
  },

  clear: () => {
    const existing = get().rasterImage
    if (existing?.previewUrl) {
      URL.revokeObjectURL(existing.previewUrl)
    }

    set({
      rasterImage: null,
      svgResult: null,
      outputFileName: null,
      error: null,
      isConverting: false,
    })
  },
}))
