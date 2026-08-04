import { useState, useEffect, useRef, useCallback } from "react"
import { X, FileText, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import mammoth from "mammoth"
import { getFile } from "@/services/fileStorage"
import { getVaultProvider } from "@/services/vault"
import { useAuth } from "@/hooks/useAuth"
import { loadPdfJs, ensurePdfWorker } from "@/services/pdfjs"

function buildDocxHtml(value, filename) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${filename || "Document"}</title><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6;color:#333}img{max-width:100%}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px 10px;text-align:left}</style></head><body>${value}</body></html>`
}

export default function ResourceViewer({ item, onClose }) {
  const { user } = useAuth()
  const [status, setStatus] = useState("loading")
  const [error, setError] = useState("")
  const [numPages, setNumPages] = useState(0)
  const [renderedPages, setRenderedPages] = useState(0)
  const [docxHtml, setDocxHtml] = useState("")
  const contentRef = useRef(null)
  const cancelledRef = useRef(false)
  const pdfRef = useRef(null)
  const canvasRef = useRef([])

  useEffect(() => {
    let disposed = false
    cancelledRef.current = false
    const contentNode = contentRef.current

    async function getBytes() {
      if (item.storagePath) {
        const provider = getVaultProvider()
        const blob = await provider.downloadFile(user, item.storagePath)
        const arrayBuffer = await blob.arrayBuffer()
        return new Uint8Array(arrayBuffer)
      }
      let fileData = item.fileData
      if (!fileData) {
        fileData = await getFile(item.id)
      }
      if (!fileData) {
        throw new Error("File not found")
      }
      const binary = atob(fileData.split(",")[1])
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return bytes
    }

    async function renderPdf(bytes) {
      await ensurePdfWorker()
      const { getDocument } = await loadPdfJs()
      const pdf = await getDocument({ data: bytes.slice(0) }).promise
      if (disposed || cancelledRef.current) {
        pdf.destroy().catch(() => {})
        return
      }
      pdfRef.current = pdf
      setNumPages(pdf.numPages)

      const container = contentNode
      const width = container?.clientWidth || 640
      const dpr = window.devicePixelRatio || 1
      for (let i = 1; i <= pdf.numPages; i++) {
        if (disposed || cancelledRef.current) return
        const page = await pdf.getPage(i)
        const base = page.getViewport({ scale: 1 })
        const scale = Math.max((width / base.width) * dpr, 0.25 * dpr)
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement("canvas")
        canvasRef.current.push(canvas)
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`
        canvas.style.display = "block"
        canvas.style.margin = "0 auto 16px auto"
        canvas.style.maxWidth = "100%"
        canvas.style.boxShadow = "0 1px 4px rgba(0,0,0,0.15)"
        container?.appendChild(canvas)
        await page.render({
          canvasContext: canvas.getContext("2d"),
          viewport,
        }).promise
        if (disposed || cancelledRef.current) return
        setRenderedPages(i)
      }
      setStatus("ready")
    }

    async function load() {
      try {
        const bytes = await getBytes()
        if (disposed || cancelledRef.current) return
        if (item.type === "pdf") {
          await renderPdf(bytes)
        } else {
          const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer })
          if (disposed || cancelledRef.current) return
          setDocxHtml(buildDocxHtml(result.value, item.filename))
          setStatus("ready")
        }
      } catch (err) {
        if (disposed || cancelledRef.current) return
        setError(err instanceof Error ? err.message : "Failed to open file")
        setStatus("error")
      }
    }

    load()

    return () => {
      disposed = true
      cancelledRef.current = true
      if (pdfRef.current) {
        pdfRef.current.destroy().catch(() => {})
        pdfRef.current = null
      }
      canvasRef.current.forEach((canvas) => canvas.remove())
      canvasRef.current = []
    }
  }, [item, user])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onClose()
    },
    [onClose]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  if (!item) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-150">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <Card className="modal-card relative z-10 flex h-[90vh] w-full max-w-3xl flex-col mx-4 animate-in zoom-in-95 duration-150">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="truncate text-base">{item.title}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>

        <CardContent
          ref={contentRef}
          className="relative flex-1 overflow-auto p-4"
        >
          {status === "loading" && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-sm">
                {item.type === "pdf"
                  ? renderedPages > 0
                    ? `Rendering page ${renderedPages} of ${numPages}...`
                    : "Opening PDF..."
                  : "Opening document..."}
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          )}

          {status === "ready" && item.type === "docx" && (
            <iframe
              title={item.filename || item.title}
              sandbox=""
              srcDoc={docxHtml}
              className="h-full w-full"
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
