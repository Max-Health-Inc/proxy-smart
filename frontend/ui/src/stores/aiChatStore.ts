import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ChatMessage } from '../lib/ai-assistant';

interface AIChatState {
  // Chat state
  messages: ChatMessage[];
  conversationId: string | null;
  isMinimized: boolean;
  isOpen: boolean;
  scrollPosition: number;
  isSummarizing: boolean; // New: indicates conversation is being summarized
  
  // Settings
  streamingEnabled: boolean;
  selectedModel: string;
  
  // Actions
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  setConversationId: (id: string | null) => void;
  setIsMinimized: (minimized: boolean) => void;
  setIsOpen: (open: boolean) => void;
  setScrollPosition: (position: number) => void;
  setStreamingEnabled: (enabled: boolean) => void;
  setSelectedModel: (model: string) => void;
  setIsSummarizing: (summarizing: boolean) => void;
  replaceOldMessagesWithSummary: (keepRecentCount: number, summaryContent: string) => void;
  resetChat: () => void;
}

const getInitialMessage = (): ChatMessage => ({
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
});

export const useAIChatStore = create<AIChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      messages: [getInitialMessage()],
      conversationId: null,
      isMinimized: false,
      isOpen: false,
      scrollPosition: 0,
      isSummarizing: false,
      
      // Settings
      streamingEnabled: true,
      selectedModel: 'gpt-5-nano',

      // Actions
      addMessage: (message) => {
        const { messages } = get();
        set({ messages: [...messages, message] });
      },

      updateMessage: (id, updates) => {
        const { messages } = get();
        
        // Defensive logging: warn if updating a message with empty content
        if (updates.content !== undefined) {
          const contentLength = updates.content?.trim().length || 0;
          if (contentLength === 0) {
            console.error('[AIChatStore] WARNING: Updating message with empty content!', {
              messageId: id,
              updates,
              currentMessage: messages.find(m => m.id === id)
            });
          }
        }
        
        set({
          messages: messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg
          ),
        });
      },

      clearMessages: () => {
        set({ messages: [getInitialMessage()] });
      },

      setConversationId: (id) => {
        set({ conversationId: id });
      },

      setIsMinimized: (minimized) => {
        set({ isMinimized: minimized });
      },

      setIsOpen: (open) => {
        set({ isOpen: open });
      },

      setScrollPosition: (position) => {
        set({ scrollPosition: position });
      },

      setStreamingEnabled: (enabled) => {
        set({ streamingEnabled: enabled });
      },

      setSelectedModel: (model) => {
        set({ selectedModel: model });
      },

      setIsSummarizing: (summarizing) => {
        set({ isSummarizing: summarizing });
      },

      replaceOldMessagesWithSummary: (keepRecentCount, summaryContent) => {
        const { messages } = get();
        if (messages.length <= keepRecentCount) {
          console.warn('[AIChatStore] Not enough messages to summarize');
          return;
        }

        // Keep the initial greeting, summary, and recent messages
        const initialMessage = messages[0];
        const recentMessages = messages.slice(-keepRecentCount);
        
        const summaryMessage: ChatMessage = {
          id: crypto.randomUUID(),
          type: 'agent',
          content: summaryContent,
          timestamp: new Date(),
          sources: []
        };

        set({ 
          messages: [initialMessage, summaryMessage, ...recentMessages]
        });
      },

      resetChat: () => {
        set({
          messages: [getInitialMessage()],
          conversationId: null,
          isMinimized: false,
          scrollPosition: 0,
          isSummarizing: false,
        });
      },
    }),
    {
      name: 'ai-chat-store',
      storage: createJSONStorage(() => localStorage),
      // Serialize dates properly
      partialize: (state) => ({
        messages: state.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString(),
        })),
        conversationId: state.conversationId,
        isMinimized: state.isMinimized,
        isOpen: state.isOpen,
        scrollPosition: state.scrollPosition,
        streamingEnabled: state.streamingEnabled,
        selectedModel: state.selectedModel,
        isSummarizing: state.isSummarizing,
      }),
      // Deserialize dates back to Date objects
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.messages = state.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp as unknown as string),
          }));
        }
      },
    }
  )
);
