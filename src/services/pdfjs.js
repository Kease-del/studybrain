export const PDFJS_VERSION = "6.2.108"

let pdfjsPromise = null
let pdfWorkerInit = false

export function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist")
  }
  return pdfjsPromise
}

export async function ensurePdfWorker() {
  const { GlobalWorkerOptions } = await loadPdfJs()
  if (!pdfWorkerInit) {
    GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`
    pdfWorkerInit = true
  }
}
