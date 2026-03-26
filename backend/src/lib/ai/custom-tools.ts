/**
 * Custom AI Tools - Tools that don't map to API routes
 * 
 * This module defines special-purpose tools that integrate with external services.
 * 
 * Documentation search is available via:
 * - Public HTTP routes: GET /docs-api/search/semantic?q=query, GET /docs-api/search/keyword?q=query
 * - AI assistant tool: search_documentation (registered in routes/admin/ai.ts setupTools)
 */

import type { ToolMetadata } from './tool-registry'

/**
 * Get all custom tools (non-route tools)
 */
export function getCustomTools(): Map<string, ToolMetadata> {
  const tools = new Map<string, ToolMetadata>()

  // Custom tools can be added here as needed
  // Documentation search has been moved to public HTTP routes (see /docs endpoints)
  
  return tools
}


