"use client";

import React, { ChangeEvent, useEffect } from "react";
import { Input } from "@workspace/ui/components/input";
import { useSanitizeStore } from "./sanitize_store"; // Import the Zustand store

export function PdfUploader() {
  const {
    initializeWorker,
    startScan,
    uploadedFile,
    loading,
    error,
    scanResult,
    resetState,
    worker // Access the worker instance from the store
  } = useSanitizeStore();

  useEffect(() => {
    initializeWorker();
    // Cleanup worker on component unmount
    return () => {
      if (worker) {
        worker.terminate();
      }
      resetState(); // Reset store state on unmount
    };
  }, [initializeWorker, worker, resetState]); // Depend on worker and resetState to ensure cleanup

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    if (file && file.type === "application/pdf") {
      startScan(file); // Use the store's action to start the scan
    } else {
      resetState(); // Clear state if invalid file
      alert("Please upload a single PDF file.");
    }
  };

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
        <p className="mt-2 text-sm text-gray-600">Selected file: {uploadedFile.name}</p>
      )}
    </div>
  );
}
