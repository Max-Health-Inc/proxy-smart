// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { t, type Static } from 'elysia'

/**
 * Documentation schemas for public doc routes
 */

// ==================== Documentation Entry ====================

export const DocEntry = t.Object({
  path: t.String({ description: 'Relative path from docs directory' }),
  title: t.String({ description: 'Document title extracted from first heading' }),
  category: t.String({ description: 'Document category based on directory structure' }),
  url: t.String({ description: 'Public URL to access the document' })
}, { title: 'DocEntry' })

export type DocEntryType = Static<typeof DocEntry>

// ==================== Table of Contents ====================

export const TableOfContentsResponse = t.Object({
  total_documents: t.Number({ description: 'Total number of documentation files' }),
  categories: t.Array(t.String(), { description: 'List of all categories' }),
  table_of_contents: t.Record(t.String(), t.Array(DocEntry), { 
    description: 'Documents grouped by category' 
  }),
  search: t.Object({
    keyword: t.String({ description: 'URL for keyword search endpoint' }),
    semantic: t.String({ description: 'URL for semantic search endpoint' })
  }, { description: 'Available search endpoints' })
}, { title: 'TableOfContentsResponse' })

export type TableOfContentsResponseType = Static<typeof TableOfContentsResponse>

// ==================== Keyword Search ====================

export const KeywordMatch = t.Object({
  line: t.Number({ description: 'Line number where match was found' }),
  text: t.String({ description: 'Matched line text' }),
  context: t.String({ description: 'Surrounding context (previous and next lines)' })
}, { title: 'KeywordMatch' })

export const KeywordSearchResult = t.Object({
  document: t.String({ description: 'Document title' }),
  hits: t.Number({ description: 'Number of keyword matches in document' }),
  url: t.String({ description: 'Public URL to access the document' }),
  matches: t.Array(KeywordMatch, { 
    description: 'Top matching lines (max 5 per document)' 
  })
}, { title: 'KeywordSearchResult' })

export const KeywordSearchResponse = t.Object({
  query: t.String({ description: 'Search query used' }),
  total_results: t.Number({ description: 'Number of documents with matches' }),
  total_hits: t.Number({ description: 'Total number of keyword matches across all documents' }),
  results: t.Array(KeywordSearchResult, { 
    description: 'Results sorted by hit count (descending)' 
  })
}, { title: 'KeywordSearchResponse' })

export type KeywordSearchResultType = Static<typeof KeywordSearchResult>
export type KeywordSearchResponseType = Static<typeof KeywordSearchResponse>

// ==================== Semantic Search ====================

export const SemanticSearchResult = t.Object({
  document: t.String({ description: 'Document title' }),
  similarity: t.Number({ description: 'Semantic similarity score (0-1)' }),
  url: t.String({ description: 'Public URL to access the document' }),
  title: t.String({ description: 'Document title' }),
  content_preview: t.String({ description: 'Preview of matched content (200 chars)' })
}, { title: 'SemanticSearchResult' })

export const SemanticSearchResponse = t.Object({
  query: t.String({ description: 'Search query used' }),
  total_results: t.Number({ description: 'Number of results returned' }),
  results: t.Array(SemanticSearchResult, { 
    description: 'Results sorted by similarity score (descending)' 
  })
}, { title: 'SemanticSearchResponse' })

export type SemanticSearchResultType = Static<typeof SemanticSearchResult>
export type SemanticSearchResponseType = Static<typeof SemanticSearchResponse>

// ==================== Query Schemas ====================

export const SearchQuery = t.Object({
  q: t.String({ description: 'Search query' })
})

export const SemanticSearchQuery = t.Object({
  q: t.String({ description: 'Search query' }),
  limit: t.Optional(t.String({ description: 'Maximum results (default: 10)' }))
})
