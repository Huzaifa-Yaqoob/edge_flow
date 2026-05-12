"use client"

import React, { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import Image from "next/image"
import { useOptimizerStore } from "./optimizer_store"
import { Button } from "@workspace/ui/components/button"
import { Slider } from "@workspace/ui/components/slider"
import { Label } from "@workspace/ui/components/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Loader2, XCircle } from "lucide-react"

export function ImagUploader() {
  const {
    originalImages,
    quality,
    isOptimizing,
    error,
    addImages,
    setQuality,
    optimizeImages,
    clearImages,
  } = useOptimizerStore()

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      addImages(acceptedFiles as unknown as FileList)
    },
    [addImages]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
    },
    multiple: true,
  })

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Image Optimizer</CardTitle>
        <CardDescription>
          Upload JPEG or PNG images to optimize them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          {...getRootProps()}
          className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-gray-400"
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the images here ...</p>
          ) : (
            <p>Drag 'n' drop some images here, or click to select files</p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            Only .jpeg, .jpg, and .png files are accepted
          </p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {originalImages.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Selected Images ({originalImages.length})
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {originalImages.map((image) => (
                <div key={image.id} className="group relative">
                  <Image
                    src={image.previewUrl}
                    alt={image.file.name}
                    width={100}
                    height={100}
                    layout="responsive"
                    objectFit="cover"
                    className="rounded-md"
                  />
                  <p className="mt-1 truncate text-center text-xs">
                    {image.file.name}
                  </p>
                  <button
                    onClick={() => {
                      // Implement removal if needed, for now clear all
                    }}
                    className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    title="Remove image"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={clearImages}>
                Clear All
              </Button>
            </div>
          </div>
        )}

        {originalImages.length > 0 && (
          <div className="space-y-4">
            <Label htmlFor="quality-slider">
              Optimization Quality: {quality}%
            </Label>
            <Slider
              id="quality-slider"
              min={1}
              max={100}
              step={1}
              value={[quality]}
              onValueChange={(value) => {
                if (typeof value === "number") {
                  // If it's just a number, use it directly
                  setQuality(value)
                } else if (Array.isArray(value)) {
                  // If it's an array (or readonly array), grab the first index
                  setQuality(value[0])
                }
              }}
              className="w-full"
            />
            <Button
              onClick={optimizeImages}
              disabled={isOptimizing || originalImages.length === 0}
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Optimizing...
                </>
              ) : (
                "Optimize Images"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
