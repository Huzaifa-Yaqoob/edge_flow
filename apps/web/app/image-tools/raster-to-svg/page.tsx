"use client"

import { RasterToSvgUploader } from "@/components/raster_to_svg/RasterToSvgUploader"
import { RasterToSvgResult } from "@/components/raster_to_svg/RasterToSvgResult"

export default function RasterToSvgPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-8 text-center text-3xl font-bold">Raster to SVG</h1>
      <RasterToSvgUploader />
      <RasterToSvgResult />
    </div>
  )
}
