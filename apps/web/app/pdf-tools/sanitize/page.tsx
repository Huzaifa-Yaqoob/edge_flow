import { PdfUploader } from "@/components/sanitize/PdfUploader"

export default function SanitizePdfPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <h1 className="mb-8 text-5xl font-bold">Sanitize PDF</h1>
      <p className="mb-8 max-w-2xl text-center text-lg">
        Remove sensitive information and metadata from your PDF files to ensure
        privacy.
      </p>
      <PdfUploader />
    </div>
  )
}
