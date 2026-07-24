// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/** Shared return type for PDF text extraction adapters */
export type PdfEngine = 'opendataloader'

export interface PdfExtractResult {
  markdown: string
  pages: number
  engine: PdfEngine
}
