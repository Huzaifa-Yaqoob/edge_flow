"use client"
import React, { useState, useEffect } from "react"
import { Viewer, Worker } from "@react-pdf-viewer/core"
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout"
import "@react-pdf-viewer/core/lib/styles/index.css"
import "@react-pdf-viewer/default-layout/lib/styles/index.css"
import { useSanitizeStore } from "./sanitize_store"

const PDFJS_VERSION = "3.4.120"
const PDF_WORKER_URL = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`

export function PdfPreview() {
  const { scanResult } = useSanitizeStore()
  const defaultLayoutPluginInstance = defaultLayoutPlugin()
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!scanResult?.pdf_data) {
      setPdfUrl(null)
      return
    }

    const data = scanResult.pdf_data
    let bytes: Uint8Array | null = null

    if (data instanceof Uint8Array && data.length > 0) {
      bytes = data
    } else if (data instanceof ArrayBuffer) {
      bytes = new Uint8Array(data)
    } else if (Array.isArray(data)) {
      bytes = new Uint8Array(data)
    } else if (ArrayBuffer.isView(data)) {
      bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    } else if (typeof data === "object" && data !== null && "data" in data) {
      const nested = (data as { data?: unknown }).data
      if (nested instanceof Uint8Array) bytes = nested
      else if (nested instanceof ArrayBuffer) bytes = new Uint8Array(nested)
      else if (Array.isArray(nested)) bytes = new Uint8Array(nested)
    }

    if (!bytes || bytes.length === 0) {
      setPdfUrl(null)
      return
    }

    const blob = new Blob([bytes], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    setPdfUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [scanResult?.pdf_data])

  if (!scanResult || !scanResult.pdf_data) {
    return (
      <div className="p-4 text-center">No PDF data available for preview.</div>
    )
  }

  if (!pdfUrl) {
    return <div className="p-4 text-center">Invalid PDF byte data.</div>
  }

  return (
    <div className="flex h-screen">
      <div className="w-1/4 overflow-y-auto border-r p-4">
        <h3 className="mb-4 text-lg font-semibold">Findings</h3>
        {scanResult.findings && scanResult.findings.length > 0 ? (
          <ul>
            {scanResult.findings.map((finding: any, index: any) => (
              <li
                key={index}
                className="mb-2 rounded-md border bg-gray-50 p-2 dark:bg-gray-700"
              >
                <strong>{finding.category}:</strong> {finding.value} (Page:{" "}
                {finding.page})
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No findings found.</p>
        )}
      </div>
      <div className="flex-1 p-4">
        <h3 className="mb-4 text-lg font-semibold">PDF Preview</h3>
        <div className="h-[calc(100vh-100px)]">
          <Worker workerUrl={PDF_WORKER_URL}>
            <Viewer fileUrl={pdfUrl} plugins={[defaultLayoutPluginInstance]} />
          </Worker>
        </div>
      </div>
    </div>
  )
}
