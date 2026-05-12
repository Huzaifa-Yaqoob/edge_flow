"use client"

import { ImagUploader } from "@/components/image_optimizer/ImagUploader"
import { OptimizedResult } from "@/components/image_optimizer/OPtimized_result"

export default function ImageOptimizerPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-8 text-center text-3xl font-bold">Image Optimizer</h1>
      <ImagUploader />
      <OptimizedResult />
    </div>
  )
}
