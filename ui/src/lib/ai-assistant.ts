import { 
  AiApi, 
  Configuration, 
  ResponseError,
  type ChatRequest, 
  type ChatResponse,
  type ChatResponseTokensUsed,
  type DocumentChunk,
  type ToolExecution
} from './api-client';
import { extractPageContext, summarizePageContext } from './page-context-extractor';
import { getStoredToken } from './apiClient';

/**
 * Estimate token count for text (rough approximation)
 * OpenAI uses ~4 characters per token on average
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate total tokens for a conversation
 */
export function estimateConversationTokens(messages: Array<{ role: string; content: string }>): number {
  return messages.reduce((total, msg) => {
    // Add overhead for message structure (role, formatting, etc.)
    const messageOverhead = 4;
    return total + estimateTokens(msg.content) + messageOverhead;
  }, 0);
}

/**
 * Maximum tokens before we should summarize conversation history
 * GPT-4 context is 128k tokens, but we want to leave room for:
 * - Current message and response (est. 4k tokens)
 * - Page context (est. 2k tokens)
 * - Tool definitions (est. 10k tokens)
 * So we'll summarize when conversation history exceeds ~100k tokens
 */
export const MAX_CONVERSATION_TOKENS = 100000;

/**
 * Keep recent messages unsummarized (last N messages)
 * This ensures immediate context is preserved
 */
export const KEEP_RECENT_MESSAGES = 3;

/**
 * UI-specific wrapper around ChatResponse that adds UI state
 * - Extends the API's ChatResponse with UI-specific fields
 * - Makes conversationId and model optional since user messages don't have them
 */
export interface ChatMessage extends Omit<ChatResponse, 'answer' | 'timestamp' | 'conversationId' | 'model'> {
  id: string;
  type: 'user' | 'agent';
  content: string; // For user messages; for agent messages, maps to ChatResponse.answer
  timestamp: Date; // UI uses Date object; API timestamp is ISO string
  streaming?: boolean; // UI state: indicates if message is still being streamed
  functionCalls?: string[]; // Derived from toolsUsed for backward compatibility
  // Make these optional since user messages don't have them
  conversationId?: string;
  model?: string;
}

/**
 * Server-Sent Events streaming chunk types
 * - Used for real-time streaming of AI responses
 * - Not a REST API model, but SSE event payloads
 */
export interface StreamChunk {
  type: 'sources' | 'content' | 'done' | 'error' | 'function_calling' | 'reasoning' | 'reasoning_done';
  sources?: DocumentChunk[];
  content?: string;
  mode?: string;
  confidence?: number;
  error?: string;
  name?: string; // Function name being called
  // Fields below mirror ChatResponse for the 'done' event
  model?: string;
  toolsUsed?: ToolExecution[];
  tokensUsed?: ChatResponseTokensUsed;
  totalDuration?: number;
  conversationId?: string;
  timestamp?: string;
}

class SmartOnFHIRAIAssistant {
  private backendAvailable: boolean | null = null; // null = not checked, true = available, false = unavailable

  constructor() {
    // Empty constructor - we'll create AiApi instances with tokens when needed
  }

  /**
   * Create AiApi instance with authentication token
   */
  private async createAiApi(): Promise<AiApi> {
    const token = await getStoredToken();
    const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const apiConfig = new Configuration({
      basePath: baseUrl,
      accessToken: token || undefined, // Pass token if available
    });
    return new AiApi(apiConfig);
  }

  /**
   * Check if backend AI API is available using HEAD request
   */
  private async checkBackendAvailability(): Promise<boolean> {
    // Use cached value if already checked
    if (this.backendAvailable !== null) {
      return this.backendAvailable;
    }

    try {
      // Use generated HEAD method with timeout
      const aiApi = await this.createAiApi();
      await aiApi.headAdminAiChat({
        signal: AbortSignal.timeout(2000)
      });
      this.backendAvailable = true;
      return true;
    } catch (error) {
      // 503 means endpoint exists but MCP is down - still consider it "available"
      if (error instanceof Response && error.status === 503) {
        this.backendAvailable = true;
        return true;
      }
      this.backendAvailable = false;
      return false;
    }
  }

  /**
   * Summarize conversation history when it gets too long
   * Keeps recent messages intact and summarizes older ones
   */
  async summarizeConversation(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    keepRecentCount = KEEP_RECENT_MESSAGES
  ): Promise<{ role: 'system'; content: string }> {
    if (messages.length <= keepRecentCount) {
      return {
        role: 'system',
        content: 'No conversation history to summarize.'
      };
    }

    // Split into old (to summarize) and recent (to keep)
    const oldMessages = messages.slice(0, -keepRecentCount);
    const oldMessageText = oldMessages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');

    // Request AI to summarize the old messages
    const summaryRequest: ChatRequest = {
      message: `Please provide a concise summary of the following conversation history. Focus on key points, decisions made, and important context. Keep it under 500 words.\n\n${oldMessageText}`,
      model: 'gpt-4o-mini' // Use faster/cheaper model for summarization
    };

    try {
      const aiApi = await this.createAiApi();
      const response = await aiApi.postAdminAiChat({ chatRequest: summaryRequest });
      
      return {
        role: 'system',
        content: `[Conversation Summary - ${oldMessages.length} messages]: ${response.answer}`
      };
    } catch (error) {
      console.error('[AI Assistant] Failed to summarize conversation:', error);
      // Fallback: create a simple summary
      return {
        role: 'system',
        content: `[Conversation Summary - ${oldMessages.length} previous messages were exchanged]`
      };
    }
  }

  /**
   * Call backend AI API using generated client
   */
  private async callBackendAI(
    message: string, 
    conversationId?: string, 
    pageContext?: string, 
    model?: string,
    conversationMessages?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<ChatResponse> {
    const request: ChatRequest & { messages?: Array<{ role: 'user' | 'assistant'; content: string }> } = {
      message,
      conversationId,
      pageContext,
      model,
      messages: conversationMessages
    };

    try {
      const aiApi = await this.createAiApi();
      const response = await aiApi.postAdminAiChat({ chatRequest: request });
      return response;
    } catch (error) {
      if (error instanceof ResponseError) {
        try {
          const bodyText = await error.response.text();
          console.error('[AI Assistant] Backend AI API response error:', error.response.status, error.response.statusText, bodyText.slice(0, 1000));
        } catch (parseError) {
          console.error('[AI Assistant] Failed to read backend error response', parseError);
        }
      }

      // Re-throw with more context
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Backend AI API error: ${errorMessage}`);
    }
  }

  /**
   * Check if OpenAI is available (via backend)
   */
  async isOpenAIAvailable(): Promise<boolean> {
    return await this.checkBackendAvailability();
  }

  /**
   * Reset the backend availability cache and recheck
   * Useful for retrying connection after MCP server is started
   */
  async retryConnection(): Promise<boolean> {
    this.backendAvailable = null; // Reset cache
    return await this.checkBackendAvailability();
  }

  /**
   * Check if backend API is authenticated
   */
  async isBackendAuthenticated(): Promise<boolean> {
    try {
      const aiApi = await this.createAiApi();
      const health = await aiApi.getAdminAiHealth() as { backend_authenticated?: boolean };
      return health.backend_authenticated === true;
    } catch {
      return false;
    }
  }

  /**
   * Generate AI response using backend API
   */
  async generateResponse(userMessage: string, conversationId?: string, model?: string): Promise<ChatResponse> {
    // Check if backend is available
    const isBackendAvailable = await this.checkBackendAvailability();

    if (!isBackendAvailable) {
      // Return a minimal, valid ChatResponse shape so the UI can render gracefully
      return {
        answer: "⚠️ AI Assistant service is currently unavailable. Please try again later or contact your administrator.",
        sources: [],
        model: 'unavailable',
        conversationId: conversationId ?? crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        toolsUsed: [],
        totalDuration: 0
      };
    }

    try {
      // Call backend AI API and return as-is (already matches ChatResponse)
      const backendResponse = await this.callBackendAI(userMessage, conversationId, undefined, model);
      return backendResponse;
    } catch (error) {
      console.error('Backend AI API call failed:', error);
      // Return a minimal, valid ChatResponse shape with error messaging
      return {
        answer: "❌ I'm sorry, I encountered an error processing your request. Please try again or contact your administrator if the problem persists.",
        sources: [],
        model: 'error',
        conversationId: conversationId ?? crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        toolsUsed: [],
        totalDuration: 0
      };
    }
  }

  /**
   * Generate AI response with streaming support
   */
  async *generateResponseStream(
    userMessage: string, 
    conversationId?: string, 
    model?: string,
    conversationMessages?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): AsyncGenerator<StreamChunk> {
    // Check if backend is available
    const isBackendAvailable = await this.checkBackendAvailability();

    if (!isBackendAvailable) {
      yield {
        type: 'content',
        content: "⚠️ AI Assistant service is currently unavailable. Please try again later or contact your administrator."
      };
      yield {
        type: 'done',
        mode: 'error',
        confidence: 0.0
      };
      return;
    }

    try {
      // Extract current page context
      const pageContext = extractPageContext();
      const contextSummary = summarizePageContext(pageContext);

      // Use provided conversation messages or empty array
      const messages = conversationMessages || [];

      // 🐛 DEBUG: Log what we're sending in detail
      console.log('📤 [AI Assistant] Sending to backend:', {
        userMessage,
        messagesCount: messages.length,
        messages: messages.map((m, i) => ({
          index: i,
          role: m.role,
          contentLength: m.content.length,
          contentPreview: m.content.substring(0, 100) + (m.content.length > 100 ? '...' : '')
        })),
        hasConversationId: !!conversationId,
        hasPageContext: !!contextSummary,
        hasModel: !!model
      });

      // Log what we're sending
      const requestBody = {
        message: userMessage,
        messages: messages, // Send full conversation history
        conversationId,
        pageContext: contextSummary,
        model
      };

      console.log('[AI Assistant] Sending request with page context:', {
        messageLength: userMessage.length,
        messagesCount: messages.length,
        contextLength: contextSummary.length,
        contextPreview: contextSummary.slice(0, 200),
        requestBody: requestBody
      });

      // Get base URL from config (same as API clients use)
      const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

      // Get stored authentication token
      const token = await getStoredToken();

      // Build headers with authentication
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Use manual fetch for SSE streaming since generated client doesn't handle streams properly
      const response = await fetch(`${baseUrl}/admin/ai/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(60000) // 60s timeout for streaming
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        try {
          console.error('[AI Assistant] Response body is not readable; content-type:', response.headers.get('content-type'));
        } catch {/* noop */ }
        throw new Error('Response body is not readable');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const raw = line.slice(5);
          const data = raw.startsWith(' ') ? raw.slice(1) : raw; // support both 'data: ' and 'data:'
          if (!data.trim()) continue;

          // Skip the [DONE] marker that indicates end of stream
          if (data.trim() === '[DONE]') {
            continue;
          }

          try {
            const evt = JSON.parse(data);

            // Map AI SDK UI message stream events to our StreamChunk union
            const type = (evt.type as string | undefined)?.toLowerCase();

            // Error event
            if (type === 'error' || typeof evt.error === 'string') {
              const msg = typeof evt.error === 'string' ? evt.error : 'An error occurred.';
              yield { type: 'error', error: msg } as StreamChunk;
              continue;
            }

            // Sources (if server provides them)
            if (Array.isArray(evt.sources)) {
              yield { type: 'sources', sources: evt.sources } as StreamChunk;
              // Note: don't continue here; a finish event may also be present in the same frame
            }

            // Text delta: prefer explicit delta, then text/textDelta, then generic data/content
            const deltaCandidates: unknown[] = [evt.delta, evt.textDelta, evt.text, evt.data, evt.content];
            const textCandidate = deltaCandidates.find((v) => typeof v === 'string') as string | undefined;
            if ((type?.includes('text') && type?.includes('delta')) || typeof evt.delta === 'string' || typeof evt.textDelta === 'string' || typeof evt.text === 'string') {
              if (textCandidate && textCandidate.length > 0) {
                yield { type: 'content', content: textCandidate };
                continue;
              }
            }

            // Reasoning: various SDKs use 'reasoning', 'thinking', with text or delta fields
            if ((type?.includes('reason') || type?.includes('think')) && typeof textCandidate === 'string') {
              yield { type: 'reasoning', content: textCandidate };
              continue;
            }

            // Tool call notifications
            const toolName = (evt.toolName as string) || (evt.name as string) || (evt.tool?.name as string);
            if (type?.startsWith('tool') && toolName) {
              yield { type: 'function_calling', name: toolName } as StreamChunk;
              continue;
            }

            // Finish/end markers - map server "finish" payload to our "done" with metadata when available
            if (type && ['finish', 'end', 'message-end', 'message-finish', 'done'].includes(type)) {
              // Signal the end of any reasoning stream
              yield { type: 'reasoning_done' } as StreamChunk;

              const doneChunk: StreamChunk = { type: 'done' };
              // Copy known metadata fields if present
              if (typeof evt.model === 'string') doneChunk.model = evt.model as string;
              if (evt.toolsUsed && Array.isArray(evt.toolsUsed)) doneChunk.toolsUsed = evt.toolsUsed as ToolExecution[];
              
              // AI SDK UI stream sends usage object with inputTokens, outputTokens, totalTokens
              // Map directly to our tokensUsed format (already in AI SDK format from backend)
              if (evt.usage && typeof evt.usage === 'object') {
                const usage = evt.usage as Record<string, number | undefined>;
                doneChunk.tokensUsed = {
                  inputTokens: usage.inputTokens || usage.promptTokens || 0,
                  outputTokens: usage.outputTokens || usage.completionTokens || 0,
                  reasoningTokens: usage.reasoningTokens,
                  totalTokens: usage.totalTokens || 0
                };
              } else if (evt.tokensUsed) {
                // Fallback to tokensUsed if present (already in correct format from backend)
                doneChunk.tokensUsed = evt.tokensUsed as ChatResponseTokensUsed;
              }
              
              if (typeof evt.totalDuration === 'number') doneChunk.totalDuration = evt.totalDuration as number;
              if (typeof evt.conversationId === 'string') doneChunk.conversationId = evt.conversationId as string;
              if (typeof evt.timestamp === 'string') doneChunk.timestamp = evt.timestamp as string;

              yield doneChunk;
              continue;
            }

            // Fallback: any remaining plain content
            if (typeof evt.content === 'string') {
              yield { type: 'content', content: evt.content };
              continue;
            }

            // Log unknown event types for debugging
            if (evt.type) {
              console.log('[AI Assistant] Unhandled SSE event type:', { type: evt.type, evt });
            }
          } catch (e) {
            console.warn('Failed to parse SSE data:', data, e);
          }
        }
      }

    } catch (error) {
      console.error('Streaming AI request failed:', error);

      // Provide user-friendly error message based on error type
      let errorMessage = 'I encountered an issue processing your request. Please try again.';

      if (error instanceof Error) {
        const errorStr = error.message.toLowerCase();

        if (errorStr.includes('timeout') || errorStr.includes('timed out')) {
          errorMessage = 'The request took too long to complete. Please try again with a shorter question.';
        } else if (errorStr.includes('network') || errorStr.includes('failed to fetch')) {
          errorMessage = 'Unable to connect to the AI service. Please check your connection and try again.';
        } else if (errorStr.includes('aborted')) {
          errorMessage = 'The request was cancelled. Please try again.';
        }

        // Log full error details for debugging (but don't show to user)
        console.error('Full error details:', {
          message: error.message,
          stack: error.stack
        });
      }

      yield {
        type: 'error',
        error: errorMessage
      };
    }
  }

  /**
   * Start a new conversation
   */
  async startConversation(): Promise<ChatMessage[]> {
    return [
      {
        id: crypto.randomUUID(),
        type: 'agent',
        content: `👋 Hello! I'm your SMART on FHIR platform assistant. I can help you with:

📊 **Dashboard** - System overview and monitoring
👥 **User Management** - Healthcare users and FHIR associations  
📱 **SMART Apps** - Application registration and management
🏥 **FHIR Servers** - Server configuration and health
🔑 **Identity Providers** - Authentication setup
🎯 **Scope Management** - Permissions and access control
🚀 **Launch Context** - Clinical workflow contexts
📈 **OAuth Monitoring** - Real-time flow analytics

What would you like to know more about?`,
        timestamp: new Date(),
        sources: []
      }
    ];
  }

  /**
   * Add message to conversation and get AI response
   */
  async chat(
    messages: ChatMessage[],
    userMessage: string,
    conversationId?: string
  ): Promise<ChatMessage[]> {
    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    // Get AI response
    const response = await this.generateResponse(userMessage, conversationId);

    // Add AI response with all metadata
    const aiMsg: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'agent',
      content: response.answer,
      timestamp: new Date(),
      sources: response.sources,
      model: response.model,
      toolsUsed: response.toolsUsed,
      tokensUsed: response.tokensUsed,
      totalDuration: response.totalDuration,
      conversationId: response.conversationId
    };

    return [...messages, userMsg, aiMsg];
  }
}

// Export singleton instance
export const aiAssistant = new SmartOnFHIRAIAssistant();
