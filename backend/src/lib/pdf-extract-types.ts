/** Shared return type for PDF text extraction adapters */
export type PdfEngine = 'opendataloader'

export interface PdfExtractResult {
  markdown: string
  pages: number
  engine: PdfEngine
}
