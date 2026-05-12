"use client"

import React from "react"
import Image from "next/image"
import { useOptimizerStore } from "./optimizer_store"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Download } from "lucide-react"

export function OptimizedResult() {
  const { optimizedImages } = useOptimizerStore()

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
  }

  const calculateReduction = (originalSize: number, optimizedSize: number) => {
    if (originalSize === 0) return "0%"
    const reduction = ((originalSize - optimizedSize) / originalSize) * 100
    return reduction.toFixed(2) + "%"
  }

  if (optimizedImages.length === 0) {
    return null
  }

  return (
    <Card className="mx-auto mt-8 w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Optimized Results</CardTitle>
        <CardDescription>
          View and download your optimized images.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {optimizedImages.map((image) => (
            <Card key={image.id}>
              <CardContent className="p-4">
                <div className="relative mb-4 h-48 w-full">
                  <Image
                    src={image.dataUrl}
                    alt={`Optimized ${image.fileName}`}
                    layout="fill"
                    objectFit="contain"
                    className="rounded-md bg-gray-100"
                  />
                </div>
                <p className="truncate text-sm font-semibold">
                  {image.fileName}
                </p>
                <p className="text-xs text-gray-500">
                  Original: {formatBytes(image.originalSize)}
                </p>
                <p className="text-xs text-gray-500">
                  Optimized: {formatBytes(image.optimizedSize)}
                </p>
                <p className="text-xs font-medium text-green-600">
                  Reduction:{" "}
                  {calculateReduction(image.originalSize, image.optimizedSize)}
                </p>
                <Button
                  className="mt-4 w-full"
                  nativeButton={false}
                  render={
                    <a
                      href={image.dataUrl}
                      download={`optimized_${image.fileName}`}
                    >
                      <Download className="mr-2 h-4 w-4" /> Download
                    </a>
                  }
                ></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
