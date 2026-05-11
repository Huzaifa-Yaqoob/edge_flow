"use client";

import React, { useEffect } from "react";
import { PdfUploader } from "../../../components/sanitize/PdfUploader";
import { useSanitizeStore } from "../../../components/sanitize/sanitize_store";

export default function SanitizePdfPage() {
  const { uploadedFile, scanResult, loading, error, resetState } = useSanitizeStore();

  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      resetState();
    };
  }, [resetState]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-5xl font-bold mb-8">Sanitize PDF</h1>
      <p className="text-lg text-center max-w-2xl mb-8">
        Remove sensitive information and metadata from your PDF files to ensure privacy.
      </p>
      <PdfUploader />

      {loading && <p className="mt-4 text-blue-500">Scanning PDF...</p>}
      {error && <p className="mt-4 text-red-500">Error: {error}</p>}

      {scanResult && (
        <div className="mt-8 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 w-full max-w-md">
          <h2 className="text-xl font-semibold mb-2">Scan Results:</h2>
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(scanResult, null, 2)}</pre>
          <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
            Sanitize PDF
          </button>
        </div>
      )}

      {uploadedFile && !loading && !error && !scanResult && (
        <div className="mt-8 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 w-full max-w-md">
          <h2 className="text-xl font-semibold">File Ready for Sanitization:</h2>
          <p>Name: {uploadedFile.name}</p>
          <p>Size: {(uploadedFile.size / 1024).toFixed(2)} KB</p>
          <p>Type: {uploadedFile.type}</p>
          <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
            Sanitize PDF
          </button>
        </div>
      )}
    </div>
  );
}
