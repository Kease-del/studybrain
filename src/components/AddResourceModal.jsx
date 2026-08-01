import { useState, useRef, useEffect, useCallback } from "react"
import { X, Upload, FileIcon } from "lucide-react"
import mammoth from "mammoth"
import toast from "react-hot-toast"
import { chunkText } from "@/services/chunker"
import { storeFile, deleteFile as deleteIndexedDBFile } from "@/services/fileStorage"
import { loadPdfJs, ensurePdfWorker } from "@/services/pdfjs"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useVault } from "@/hooks/useVault"

const TYPES = [
  { value: "text", label: "Text" },
  { value: "link", label: "Link" },
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "Document" },
]

const MAX_FILE_SIZE = 10 * 1024 * 1024

async function extractPdfText(arrayBuffer) {
  await ensurePdfWorker()
  const { getDocument } = await loadPdfJs()
  const pdf = await getDocument({ data: arrayBuffer.slice(0) }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((item) => item.str).join(" ")
    pages.push({ page: i, text: pageText })
  }
  const fullText = pages.map((p) => `--- PAGE ${p.page} ---\n\n${p.text}`).join("\n\n")
  return { pages, fullText }
}

async function extractDocxText(arrayBuffer) {
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value.trim()
}

export default function AddResourceModal({ isOpen, onClose }) {
  const { addItem } = useVault()
  const fileInputRef = useRef(null)
  const [type, setType] = useState("text")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [url, setUrl] = useState("")
  const [selectedFile, setSelectedFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [tagsStr, setTagsStr] = useState("")

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") handleCancel()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  function handleTypeChange(newType) {
    setType(newType)
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return

    if (type === "pdf" && file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed.")
      e.target.value = ""
      return
    }

    if (
      type === "docx" &&
      file.type !==
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      toast.error("Only .docx files are allowed.")
      e.target.value = ""
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File is too large (max 10MB).")
      e.target.value = ""
      return
    }

    setSelectedFile(file)
  }

  function arrayBufferToDataUrl(buffer, mimeType) {
    const bytes = new Uint8Array(buffer)
    let binary = ""
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return `data:${mimeType};base64,${btoa(binary)}`
  }

  async function handleSave() {
    if (!title.trim()) return

    if (type === "pdf" || type === "docx") {
      if (!selectedFile) {
        toast.error("Please select a file.")
        return
      }

      setSaving(true)

      let resourceId

      try {
        const arrayBuffer = await selectedFile.arrayBuffer()

        let extractedText = ""
        let pages = []
        try {
          if (type === "pdf") {
            const result = await extractPdfText(arrayBuffer)
            pages = result.pages
            extractedText = result.fullText
          } else {
            extractedText = await extractDocxText(arrayBuffer)
          }
        } catch {
          toast.error("Text extraction failed.")
        }

        const fileData = arrayBufferToDataUrl(arrayBuffer, selectedFile.type)

        resourceId = crypto.randomUUID()
        await storeFile(resourceId, fileData)

        const payload = {
          id: resourceId,
          type,
          title: title.trim(),
          filename: selectedFile.name,
          fileSize: selectedFile.size,
          content: extractedText,
          chunks: chunkText(extractedText, pages),
          tags: parseTags(tagsStr),
        }

        addItem(payload)

        resetAndClose()
        toast.success("Resource added")
      } catch (err) {
        if (resourceId) deleteIndexedDBFile(resourceId).catch(() => {})
        if (err instanceof Error && (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
          toast.error("Storage full. Please delete some items and try again.")
        } else {
          toast.error("Failed to process file.")
        }
        setSaving(false)
      }

      return
    }

    const base = {
      title: title.trim(),
      tags: parseTags(tagsStr),
    }
    if (type === "text") base.content = content.trim()
    if (type === "link") base.url = url.trim()

    addItem({ type, ...base })
    resetAndClose()
    toast.success("Resource added")
  }

  function parseTags(str) {
    return str
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
  }

  function resetAndClose() {
    setTitle("")
    setContent("")
    setUrl("")
    setSelectedFile(null)
    setSaving(false)
    setTagsStr("")
    setType("text")
    if (fileInputRef.current) fileInputRef.current.value = ""
    onClose()
  }

  function handleCancel() {
    resetAndClose()
  }

  function removeFile() {
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isFileType = type === "pdf" || type === "docx"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-150">
      <div className="fixed inset-0 bg-black/50" onClick={handleCancel} />
      <Card className="modal-card relative z-10 w-full max-w-lg mx-4 shadow-card-hover animate-in zoom-in-95 duration-150">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Add resource</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <div className="modal-type-row flex gap-2">
              {TYPES.map((t) => (
                <Button
                  key={t.value}
                  type="button"
                  variant={type === t.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTypeChange(t.value)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="resource-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="resource-title"
              placeholder="Resource title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {type === "text" && (
            <div className="space-y-2">
              <label
                htmlFor="resource-content"
                className="text-sm font-medium"
              >
                Content
              </label>
              <textarea
                id="resource-content"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px] resize-none"
                placeholder="Paste or write your content..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          )}

          {type === "link" && (
            <div className="space-y-2">
              <label htmlFor="resource-url" className="text-sm font-medium">
                URL
              </label>
              <Input
                id="resource-url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          )}

          {isFileType && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {type === "pdf" ? "PDF file" : "Word document"}
              </label>

              {selectedFile ? (
                <div className="flex items-center gap-3 rounded-md border bg-accent/30 p-3">
                  <FileIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatSize(selectedFile.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="shrink-0 p-1 rounded hover:bg-accent"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed p-6 text-sm text-muted-foreground hover:bg-accent/30 transition"
                >
                  <Upload className="h-6 w-6" />
                  <span>
                    Click to select a{" "}
                    {type === "pdf"
                      ? "PDF"
                      : "Word document (.docx)"}{" "}
                    (max 10MB)
                  </span>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={
                  type === "pdf"
                    ? ".pdf,application/pdf"
                    : ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                }
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="resource-tags" className="text-sm font-medium">
              Tags
            </label>
            <Input
              id="resource-tags"
              placeholder="e.g. math, chapter-3, exam-prep"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || saving}
          >
            {saving ? "Processing..." : "Add resource"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}