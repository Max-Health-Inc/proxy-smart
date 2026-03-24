/**
 * AI Assistant - Shared types
 * 
 * The system prompt is centralized in prompts/system.md and loaded at
 * runtime by loadSystemPrompt() in routes/admin/ai.ts.
 */

export interface AIContext {
  userId: string
  roles: string[]
  email?: string
}

