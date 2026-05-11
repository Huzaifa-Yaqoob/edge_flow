"use client"
import React, { useState, useEffect, useCallback, useRef } from "react"
import { Viewer, Worker } from "@react-pdf-viewer/core"
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout"
import { searchPlugin } from "@react-pdf-viewer/search"
import {
  highlightPlugin,
  type RenderHighlightTargetProps,
  type RenderHighlightsProps,
  type HighlightArea,
} from "@react-pdf-viewer/highlight"
import "@react-pdf-viewer/core/lib/styles/index.css"
import "@react-pdf-viewer/default-layout/lib/styles/index.css"
import "@react-pdf-viewer/highlight/lib/styles/index.css"
import "@react-pdf-viewer/search/lib/styles/index.css"
import { useSanitizeStore } from "./sanitize_store"

const PDFJS_VERSION = "3.4.120"
const PDF_WORKER_URL = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`

interface Highlight {
  id: string
  content: string
  highlightAreas: HighlightArea[]
  quote: string
  isFinding?: boolean
}

interface RedactionBox {
  page: number
  xPct: number
  yPct: number
  widthPct: number
  heightPct: number
  quote: string
  note: string
  source: "user" | "finding"
}

interface RustRedactionItem {
  page: number
  xPct: number
  yPct: number
  widthPct: number
  heightPct: number
  quote: string
}

const toPdfRedactionBoxes = (highlights: Highlight[]): RedactionBox[] => {
  return highlights.flatMap((highlight) =>
    highlight.highlightAreas.map((area) => {
      return {
        page: area.pageIndex + 1,
        xPct: area.left,
        yPct: area.top,
        widthPct: area.width,
        heightPct: area.height,
        quote: highlight.quote,
        note: highlight.content,
        source: "user",
      }
    })
  )
}

const toRustRedactions = (boxes: RedactionBox[]): RustRedactionItem[] => {
  return boxes.map((box) => ({
    page: box.page,
    xPct: box.xPct,
    yPct: box.yPct,
    widthPct: box.widthPct,
    heightPct: box.heightPct,
    quote: box.quote,
  }))
}

export function PdfPreview() {
  const { scanResult, redactPdf, loading } = useSanitizeStore()
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [message, setMessage] = useState("")
  const [removedFindingValues, setRemovedFindingValues] = useState<Set<string>>(
    new Set()
  )
  const findingBoxesRef = useRef<Map<string, RedactionBox>>(new Map())

  const renderHighlightTarget = useCallback(
    (props: RenderHighlightTargetProps) => (
      <div
        style={{
          background: "#eee",
          display: "flex",
          position: "absolute",
          left: `${props.selectionRegion.left}%`,
          top: `${props.selectionRegion.top + props.selectionRegion.height}%`,
          transform: "translate(0, 8px)",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(0, 0, 0, .3)",
            borderRadius: "4px",
            padding: "8px",
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="Add note (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{
              border: "1px solid #ccc",
              borderRadius: "4px",
              padding: "4px 8px",
              width: "200px",
              color: "black",
            }}
          />
          <button
            style={{
              background: "#fbbf24",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              padding: "8px 12px",
              color: "#000",
              fontWeight: "500",
            }}
            onClick={() => {
              const newHighlight: Highlight = {
                id: `user-${Date.now()}`,
                content: message,
                highlightAreas: props.highlightAreas,
                quote: props.selectedText,
                isFinding: false,
              }
              setHighlights([...highlights, newHighlight])
              props.cancel()
              setMessage("")
            }}
          >
            Protect
          </button>
        </div>
      </div>
    ),
    [message, highlights]
  )

  const renderHighlights = useCallback(
    (props: RenderHighlightsProps) => (
      <div>
        {highlights.map((highlight) =>
          highlight.highlightAreas
            .filter((area) => area.pageIndex === props.pageIndex)
            .map((area, idx) => (
              <div
                key={`${highlight.id}-${idx}`}
                style={Object.assign(
                  {},
                  {
                    background: "rgba(239, 68, 68, 0.4)",
                    cursor: "pointer",
                    border: "1px solid rgba(239, 68, 68, 0.6)",
                  },
                  props.getCssProperties(area, props.rotation)
                )}
                onClick={() => {
                  if (
                    confirm(
                      "Remove this highlight?\n\n" +
                        highlight.quote.substring(0, 100)
                    )
                  ) {
                    setHighlights(
                      highlights.filter((h) => h.id !== highlight.id)
                    )
                  }
                }}
                title={
                  highlight.isFinding
                    ? `Finding: ${highlight.content}`
                    : `User highlight${highlight.content ? ": " + highlight.content : ""}`
                }
              />
            ))
        )}
      </div>
    ),
    [highlights]
  )

  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget,
    renderHighlights,
  })

  useEffect(() => {
    setRemovedFindingValues(new Set())
  }, [scanResult?.findings])

  const findingKeywords: string[] = Array.from(
    new Set(
      scanResult?.findings
        ?.map((finding: any) => String(finding?.value ?? "").trim())
        .filter(
          (text: string) => text.length > 0 && !removedFindingValues.has(text)
        ) ?? []
    )
  )

  const defaultLayoutPluginInstance = defaultLayoutPlugin()

  const findingKeywordsSignature = findingKeywords.join("||")

  useEffect(() => {
    findingBoxesRef.current.clear()
  }, [findingKeywordsSignature, pdfUrl])

  const renderSearchHighlights = useCallback((props: any) => {
    const areas = (props?.highlightAreas ?? []) as Array<any>

    return (
      <>
        {areas.map((area, index) => {
          const keywordValue = String(area?.keywordStr ?? "").trim()
          const box: RedactionBox = {
            page: (area?.pageIndex ?? 0) + 1,
            xPct: area?.left ?? 0,
            yPct: area?.top ?? 0,
            widthPct: area?.width ?? 0,
            heightPct: area?.height ?? 0,
            quote: keywordValue,
            note: "",
            source: "finding",
          }
          const key = `${box.page}-${box.xPct}-${box.yPct}-${box.widthPct}-${box.heightPct}-${box.quote}`
          findingBoxesRef.current.set(key, box)

          return (
            <div
              key={`${area.pageIndex}-${index}`}
              style={{
                ...props.getCssProperties(area),
                position: "absolute",
                background: "rgba(239, 68, 68, 0.35)",
                border: "1px solid rgba(239, 68, 68, 0.7)",
                borderRadius: "2px",
                cursor: "pointer",
              }}
              onClick={() => {
                if (!keywordValue) return
                setRemovedFindingValues((prev) => {
                  const next = new Set(prev)
                  next.add(keywordValue)
                  return next
                })
              }}
              title={`Finding: ${keywordValue}`}
            />
          )
        })}
      </>
    )
  }, [])

  const searchPluginInstance = searchPlugin({
    keyword: findingKeywords,
    renderHighlights: renderSearchHighlights,
  })

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

    const stableBytes = new Uint8Array(bytes)
    const blob = new Blob([stableBytes.buffer], { type: "application/pdf" })
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
    <div className="flex h-screen w-full">
      <style jsx global>{`
        .rpv-search__highlight {
          background: rgba(239, 68, 68, 0.35) !important;
          border: 1px solid rgba(239, 68, 68, 0.7);
          border-radius: 2px;
        }
      `}</style>
      <div className="w-80 flex-shrink-0 overflow-y-auto border-r bg-white p-4 dark:bg-gray-900">
        <div className="mb-4">
          <button
            className="w-full rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
            onClick={async () => {
              const payloadBoxes = [
                ...toPdfRedactionBoxes(highlights),
                ...Array.from(findingBoxesRef.current.values()),
              ]
              const redactions = toRustRedactions(payloadBoxes)
              console.log("Redaction payload:", redactions)
              await redactPdf(redactions)
            }}
            disabled={loading}
          >
            {loading ? "Processing..." : "Radicate"}
          </button>
        </div>
        <div className="mb-6">
          <h3 className="mb-3 text-lg font-semibold text-red-600 dark:text-red-400">
            🔍 Findings ({scanResult.findings?.length || 0})
          </h3>
          {scanResult.findings && scanResult.findings.length > 0 ? (
            <ul className="space-y-2">
              {scanResult.findings.map((finding: any, index: any) => (
                <li
                  key={index}
                  className="cursor-pointer rounded-lg border border-red-300 bg-red-50 p-3 text-sm dark:border-red-700 dark:bg-red-900/20"
                  onClick={() => {
                    const value = String(finding?.value ?? "").trim()
                    if (!value) return
                    setRemovedFindingValues((prev) => {
                      const next = new Set(prev)
                      next.add(value)
                      return next
                    })
                  }}
                  title="Click to remove this finding highlight"
                >
                  <div className="font-semibold text-red-700 dark:text-red-300">
                    {finding.category}
                  </div>
                  <div className="mt-1 text-gray-700 dark:text-gray-300">
                    {finding.value}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Page {finding.page}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No findings detected.</p>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-lg font-semibold text-red-600 dark:text-red-400">
            ✏️ My Highlights ({highlights.filter((h) => !h.isFinding).length})
          </h3>
          {highlights.filter((h) => !h.isFinding).length > 0 ? (
            <ul className="space-y-2">
              {highlights
                .filter((h) => !h.isFinding)
                .map((highlight) => (
                  <li
                    key={highlight.id}
                    className="cursor-pointer rounded-lg border border-red-300 bg-red-50 p-3 text-sm transition-all hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                    onClick={() => {
                      if (
                        confirm(
                          "Remove this highlight?\n\n" +
                            highlight.quote.substring(0, 100)
                        )
                      ) {
                        setHighlights(
                          highlights.filter((h) => h.id !== highlight.id)
                        )
                      }
                    }}
                  >
                    <div className="font-medium text-gray-700 dark:text-gray-300">
                      "{highlight.quote.substring(0, 80)}
                      {highlight.quote.length > 80 ? "..." : ""}"
                    </div>
                    {highlight.content && (
                      <div className="mt-1 text-xs text-gray-600 italic dark:text-gray-400">
                        💬 {highlight.content}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-gray-400">
                      Click to remove
                    </div>
                  </li>
                ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500 dark:border-gray-700">
              <p>Select text in the PDF to create highlights</p>
              <p className="mt-1 text-xs">
                (Drag to select, then click Highlight)
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden bg-gray-100 dark:bg-gray-800">
        <div className="border-b bg-white px-6 py-4 dark:bg-gray-900">
          <h3 className="text-lg font-semibold">PDF Preview</h3>
          <p className="text-sm text-gray-500">
            Select text to highlight • Red = Findings • Yellow = Your highlights
          </p>
        </div>
        <div className="flex-1 overflow-hidden p-4">
          <div className="h-full w-full">
            <Worker workerUrl={PDF_WORKER_URL}>
              <Viewer
                key={`viewer-${findingKeywordsSignature}-${pdfUrl}`}
                fileUrl={pdfUrl}
                plugins={[
                  searchPluginInstance,
                  highlightPluginInstance,
                  defaultLayoutPluginInstance,
                ]}
              />
            </Worker>
          </div>
        </div>
      </div>
    </div>
  )
}
