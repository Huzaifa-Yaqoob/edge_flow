"use client"

import React, { useState, ChangeEvent } from "react"
import { Input } from "@workspace/ui/components/input"

interface PdfUploaderProps {
  onFileUpload: (file: File | null) => void
}

export function PdfUploader({ onFileUpload }: PdfUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null
    if (file && file.type === "application/pdf") {
      setSelectedFile(file)
      onFileUpload(file)
    } else {
      setSelectedFile(null)
      onFileUpload(null)
      alert("Please upload a single PDF file.")
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-4">
      <h2 className="mb-4 text-xl font-semibold">
        Upload PDF for Sanitization
      </h2>
      <Input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="cursor-pointer"
      />
      {selectedFile && (
        <p className="mt-2 text-sm text-gray-600">
          Selected file: {selectedFile.name}
        </p>
      )}
    </div>
  )
}
