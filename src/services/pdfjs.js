export const PDFJS_VERSION = "4.7.76"

let pdfjsPromise = null
let pdfWorkerInit = false

export function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs")
  }
  return pdfjsPromise
}

export async function ensurePdfWorker() {
  const { GlobalWorkerOptions } = await loadPdfJs()
  if (!pdfWorkerInit) {
    GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/legacy/build/pdf.worker.mjs`
    pdfWorkerInit = true
  }
}
