"use client"

import React from "react"
import { Download } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { useRasterToSvgStore } from "./raster_to_svg_store"

export function RasterToSvgResult() {
  const { svgResult, outputFileName } = useRasterToSvgStore()

  if (!svgResult) return null

  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgResult)}`

  return (
    <Card className="mx-auto mt-8 w-full max-w-4xl">
      <CardHeader>
        <CardTitle>SVG Result</CardTitle>
        <CardDescription>Preview and download the generated SVG.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-white p-3">
          <img src={svgDataUrl} alt="Generated SVG" className="h-auto w-full" />
        </div>
        <Button
          nativeButton={false}
          render={
            <a
              href={svgDataUrl}
              download={outputFileName ?? "converted.svg"}
              className="inline-flex w-full items-center justify-center"
            >
              <Download className="mr-2 h-4 w-4" />
              Download SVG
            </a>
          }
        />
      </CardContent>
    </Card>
  )
}
