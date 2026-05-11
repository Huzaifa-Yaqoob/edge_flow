"use client";

import React, { useState } from "react";
import { PdfUploader } from "../../../components/sanitize/PdfUploader";

export default function SanitizePdfPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = (file: File | null) => {
    setUploadedFile(file);
    if (file) {
      console.log("File uploaded:", file.name);
      // Here you would typically process the file, e.g., send it to a WASM module
    } else {
      console.log("No file selected or invalid file type.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-5xl font-bold mb-8">Sanitize PDF</h1>
      <p className="text-lg text-center max-w-2xl mb-8">
        Remove sensitive information and metadata from your PDF files to ensure privacy.
      </p>
      <PdfUploader onFileUpload={handleFileUpload} />

      {uploadedFile && (
        <div className="mt-8 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <h2 className="text-xl font-semibold">File Ready for Sanitization:</h2>
          <p>Name: {uploadedFile.name}</p>
          <p>Size: {(uploadedFile.size / 1024).toFixed(2)} KB</p>
          <p>Type: {uploadedFile.type}</p>
          {/* Add a button to trigger sanitization here */}
          <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
            Sanitize PDF
          </button>
        </div>
      )}
    </div>
  );
}
