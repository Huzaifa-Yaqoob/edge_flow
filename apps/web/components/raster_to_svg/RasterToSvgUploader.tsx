"use client"

import React, { useCallback, useEffect } from "react"
import Image from "next/image"
import { useDropzone } from "react-dropzone"
import { Loader2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { useRasterToSvgStore } from "./raster_to_svg_store"

export function RasterToSvgUploader() {
  const {
    rasterImage,
    isConverting,
    error,
    setImage,
    convertToSvg,
    clear,
    initializeWorker,
  } = useRasterToSvgStore()

  useEffect(() => {
    initializeWorker()
  }, [initializeWorker])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (file) setImage(file)
    },
    [setImage]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/bmp": [".bmp"],
    },
    multiple: false,
  })

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Raster to SVG</CardTitle>
        <CardDescription>
          Upload one raster image and convert it to SVG.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          {...getRootProps()}
          className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-gray-400"
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the image here ...</p>
          ) : (
            <p>Drag and drop an image here, or click to select</p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            Accepted: .jpeg, .jpg, .png, .webp, .bmp
          </p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {rasterImage && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Selected Image</h3>
            <div className="max-w-sm">
              <Image
                src={rasterImage.previewUrl}
                alt={rasterImage.file.name}
                width={480}
                height={320}
                unoptimized
                className="h-auto w-full rounded-md object-contain"
              />
              <p className="mt-1 truncate text-sm">{rasterImage.file.name}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={clear} disabled={isConverting}>
                Clear
              </Button>
              <Button onClick={convertToSvg} disabled={isConverting}>
                {isConverting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Converting...
                  </>
                ) : (
                  "Convert to SVG"
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
