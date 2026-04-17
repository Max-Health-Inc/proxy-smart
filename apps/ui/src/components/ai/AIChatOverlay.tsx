import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    aiAssistant, 
    type ChatMessage,
    estimateConversationTokens,
    MAX_CONVERSATION_TOKENS,
    KEEP_RECENT_MESSAGES
} from '../../lib/ai-assistant';
import type { ChatResponseTokensUsed, DocumentChunk, ToolExecution } from '../../lib/api-client';
import { useAIChatStore } from '../../stores/aiChatStore';
import { Button, Card } from '@proxy-smart/shared-ui';
import { logger } from '@/lib/logger';
import { Bot, Brain } from 'lucide-react';
import { ChatHeader } from './ChatHeader';
import { ChatContent } from './ChatContent';

interface AIChatOverlayProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function AIChatOverlay({ isOpen: externalIsOpen, onClose: externalOnClose }: AIChatOverlayProps = {}) {
    const { t } = useTranslation();

    // Use the persistent store for chat state
    const {
        messages: chatMessages,
        isMinimized,
        isOpen: storedIsOpen,
        conversationId,
        scrollPosition,
        streamingEnabled,
        selectedModel,
        isSummarizing,
        addMessage,
        updateMessage,
        setIsMinimized,
        setIsOpen: setStoredIsOpen,
        setConversationId,
        setScrollPosition,
        setStreamingEnabled,
        setSelectedModel,
        setIsSummarizing,
        replaceOldMessagesWithSummary,
        resetChat,
    } = useAIChatStore();

    // Always use persisted state, but allow external control to override
    const isOpen = externalIsOpen ?? storedIsOpen;
    const handleSetOpen = (open: boolean) => {
        // Always persist to store
        setStoredIsOpen(open);
        // Also call external handler if provided
        if (externalOnClose && !open) {
            externalOnClose();
        }
    };
    const onClose = externalOnClose || (() => handleSetOpen(false));

    // Refs for messages container to enable smart auto-scroll
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const prevMessageCountRef = useRef(chatMessages.length);
    const shouldScrollRef = useRef(false);

    // Non-persistent UI state
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isOpenAIReady, setIsOpenAIReady] = useState(false);
    const [currentMessage, setCurrentMessage] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const [isFullWidth, setIsFullWidth] = useState(false);
    const [reasoningText, setReasoningText] = useState<string>('');
    const [isReasoning, setIsReasoning] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const handleHeaderClick = () => {
        const nextMinimized = !isMinimized;
        setIsMinimized(nextMinimized);
        if (nextMinimized) {
            setShowSettings(false);
            setIsExpanded(false);
            setIsFullWidth(false);
        }
    };

    const toggleSettingsDropdown = () => {
        if (isMinimized) {
            setIsMinimized(false);
            return;
        }

        setShowSettings((prev) => !prev);
    };

    const handleSettingsClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
        event.stopPropagation();
        toggleSettingsDropdown();
    };

    const handleSettingsKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            toggleSettingsDropdown();
        }
    };

    // Simple scroll: only when user sends a message (shouldScrollRef is set to true)
    useEffect(() => {
        // Only scroll if explicitly requested (when user sends message)
        if (shouldScrollRef.current) {
            // Use requestAnimationFrame to batch scroll updates
            requestAnimationFrame(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            });
            shouldScrollRef.current = false; // Reset the flag
        }

        // Update previous message count
        prevMessageCountRef.current = chatMessages.length;
    }, [chatMessages]);

    // Close settings dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showSettings && !(event.target as Element).closest('.settings-dropdown')) {
                setShowSettings(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showSettings]);

    useEffect(() => {
        let isMounted = true;

        (async () => {
            try {
                const available = await aiAssistant.isOpenAIAvailable();
                if (isMounted) {
                    setIsOpenAIReady(available);
                }
            } catch (error) {
                console.warn('Failed to determine OpenAI availability:', error);
                if (isMounted) {
                    setIsOpenAIReady(false);
                }
            }
        })();

        // Initialize conversation ID if not set
        if (!conversationId) {
            logger.debug('AIChatOverlay: initializing conversation ID');
            setConversationId(crypto.randomUUID());
        }

        return () => {
            isMounted = false;
        };
    }, [conversationId, setConversationId]);

    // Restore scroll position on mount/open
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container || !isOpen || isMinimized) return;

        // Restore saved scroll position after a short delay to ensure DOM is ready
        const restoreTimer = setTimeout(() => {
            if (container && scrollPosition > 0) {
                container.scrollTop = scrollPosition;
            }
        }, 100);

        return () => {
            clearTimeout(restoreTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, isMinimized]); // Only run when open/minimized state changes, not on every scroll

    // Set up scroll listener to save position (debounced)
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container || !isOpen || isMinimized) return;

        let scrollTimeout: ReturnType<typeof setTimeout>;

        // Debounced scroll handler - only save after user stops scrolling
        const handleScroll = () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                setScrollPosition(container.scrollTop);
            }, 150); // Save after 150ms of no scrolling
        };

        container.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            clearTimeout(scrollTimeout);
            container.removeEventListener('scroll', handleScroll);
        };
    }, [isOpen, isMinimized, setScrollPosition]); // Don't include scrollPosition here!

    const handleClearChat = () => {
        resetChat();
        setConversationId(crypto.randomUUID());
    };

    const handleRetryConnection = async () => {
        setIsProcessing(true);
        try {
            const connected = await aiAssistant.retryConnection();
            setIsOpenAIReady(connected);

            if (connected) {
                // Add a system message about successful connection
                const systemMessage: ChatMessage = {
                    id: crypto.randomUUID(),
                    type: 'agent',
                    content: '✅ ' + t('Successfully connected to AI Assistant! You can now ask questions and get intelligent responses.'),
                    timestamp: new Date(),
                    sources: []
                };
                addMessage(systemMessage);
            } else {
                // Add a message about failed connection
                const errorMessage: ChatMessage = {
                    id: crypto.randomUUID(),
                    type: 'agent',
                    content: '⚠️ ' + t('Unable to connect to the AI service. Please check your connection and try again.'),
                    timestamp: new Date(),
                    sources: []
                };
                addMessage(errorMessage);
            }
        } catch (error) {
            console.error('Failed to retry connection:', error);
            const errorMessage: ChatMessage = {
                id: crypto.randomUUID(),
                type: 'agent',
                content: '❌ ' + t('Connection retry failed. Please check the console for details.'),
                timestamp: new Date(),
                sources: []
            };
            addMessage(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMicToggle = () => {
        setIsListening(!isListening);
        // TODO: Implement actual voice recognition here
        // For now, we'll just toggle the visual state
        if (!isListening) {
            // Start listening
            console.log('Starting voice input...');
        } else {
            // Stop listening
            console.log('Stopping voice input...');
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentMessage.trim() || isProcessing) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'user',
            content: currentMessage,
            timestamp: new Date()
        };

        addMessage(userMessage);
        setCurrentMessage('');

        // Prepare conversation messages INCLUDING the new user message
        // (but excluding the upcoming agent message placeholder)
        const allMessages = [...chatMessages, userMessage];
        const conversationMessages = allMessages.map(m => ({
            role: m.type === 'agent' ? 'assistant' as const : 'user' as const,
            content: m.content
        }));

        // Check if we need to summarize due to token limit
        const totalTokens = estimateConversationTokens(conversationMessages);
        console.log('[AI Chat] Estimated conversation tokens:', totalTokens);

        if (totalTokens > MAX_CONVERSATION_TOKENS) {
            console.log('[AI Chat] Token limit exceeded, summarizing conversation...');
            setIsSummarizing(true);

            try {
                // Summarize old messages, keep recent ones
                const summary = await aiAssistant.summarizeConversation(
                    conversationMessages,
                    KEEP_RECENT_MESSAGES
                );

                // Replace old messages with summary in store
                replaceOldMessagesWithSummary(KEEP_RECENT_MESSAGES, summary.content);
                
                console.log('[AI Chat] Conversation summarized successfully');
            } catch (error) {
                console.error('[AI Chat] Failed to summarize conversation:', error);
                // Continue anyway - we'll send the full history
            } finally {
                setIsSummarizing(false);
            }
        }

        setIsProcessing(true);

        // Trigger scroll to show user's message
        shouldScrollRef.current = true;

        // Create placeholder message for streaming
        const agentMessageId = (Date.now() + 1).toString();
        const agentMessage: ChatMessage = {
            id: agentMessageId,
            type: 'agent',
            content: '',
            timestamp: new Date(),
            sources: [],
            streaming: true
        };

        addMessage(agentMessage);

        try {
            // Check if streaming is enabled
            if (streamingEnabled) {
                // Use streaming API
                let fullContent = '';
                let sources: DocumentChunk[] = [];
                const functionCalls: string[] = [];
                let streamingFailed = false;
                let updateCounter = 0;
                const updateThrottle = 3; // Update UI every N chunks to reduce re-renders
                let model: string | undefined;
                let toolsUsed: ToolExecution[] | undefined;
                let tokensUsed: ChatResponseTokensUsed | undefined;
                let totalDuration: number | undefined;
                let conversationIdFromResponse: string | undefined;

                // Get latest messages after potential summarization
                // We need to fetch fresh from store since summarization may have modified it
                // Include the user message, but exclude the empty agent placeholder
                const currentMessages = useAIChatStore.getState().messages;
                const latestMessages = currentMessages
                    .filter(m => m.id !== agentMessageId) // Only exclude the empty agent placeholder
                    .map(m => ({
                        role: m.type === 'agent' ? 'assistant' as const : 'user' as const,
                        content: m.content
                    }));

                for await (const chunk of aiAssistant.generateResponseStream(
                    userMessage.content, 
                    conversationId || undefined, 
                    selectedModel,
                    latestMessages
                )) {
                    if (chunk.type === 'sources' && chunk.sources) {
                        sources = chunk.sources;
                    } else if (chunk.type === 'reasoning' && chunk.content) {
                        // Stream reasoning text as "thinking" indicator
                        setReasoningText(prev => prev + chunk.content);
                        setIsReasoning(true);
                    } else if (chunk.type === 'reasoning_done') {
                        // Reasoning complete, now generating response
                        setIsReasoning(false);
                        setReasoningText('');
                    } else if (chunk.type === 'function_calling' && chunk.name) {
                        // Track function calls and show notification
                        functionCalls.push(chunk.name);
                        const functionName = chunk.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                        // Append function call notification to content
                        const notification = `\n\n🔧 **Executing: ${functionName}**\n\n`;
                        fullContent += notification;
                        updateMessage(agentMessageId, { content: fullContent, sources, functionCalls });
                    } else if (chunk.type === 'content' && chunk.content) {
                        fullContent += chunk.content;
                        updateCounter++;

                        // Throttle updates: only update every N chunks or if it's a substantial update
                        if (updateCounter >= updateThrottle || chunk.content.length > 20) {
                            updateMessage(agentMessageId, { content: fullContent, sources, functionCalls });
                            updateCounter = 0;
                        }
                    } else if (chunk.type === 'done') {
                        // Capture metadata from done event
                        if (chunk.model) model = chunk.model;
                        if (chunk.toolsUsed) toolsUsed = chunk.toolsUsed;
                        if (chunk.tokensUsed) tokensUsed = chunk.tokensUsed;
                        if (chunk.totalDuration !== undefined) totalDuration = chunk.totalDuration;
                        if (chunk.conversationId) conversationIdFromResponse = chunk.conversationId;

                        // Final update with complete content and metadata
                        console.log('[AIChatOverlay] Stream done, final fullContent length:', fullContent.length);
                        console.log('[AIChatOverlay] Final response metadata:', {
                            model,
                            toolsUsed,
                            tokensUsed,
                            totalDuration,
                            conversationId: conversationIdFromResponse,
                            functionCalls,
                            contentLength: fullContent.length,
                            sourcesCount: sources.length
                        });
                        console.log('[AIChatOverlay] Done chunk payload (all StreamChunk fields):', chunk);
                        console.log('[AIChatOverlay] Full final response object:', {
                            type: 'final_response',
                            content: fullContent,
                            metadata: {
                                model,
                                toolsUsed,
                                tokensUsed,
                                totalDuration,
                                conversationId: conversationIdFromResponse
                            },
                            sources,
                            functionCalls
                        });

                        // Validate that we have actual content (not just function call notifications)
                        // Remove function call notifications to check if there's real content
                        const contentWithoutNotifications = fullContent.replace(/\n\n🔧 \*\*Executing:.*?\*\*\n\n/g, '').trim();

                        if (!contentWithoutNotifications || contentWithoutNotifications.length < 10) {
                            console.warn('[AIChatOverlay] Stream completed but content is empty or too short:', {
                                fullContentLength: fullContent.length,
                                contentWithoutNotifications: contentWithoutNotifications.length,
                                functionCalls
                            });

                            // Provide a fallback message - mention function calls if they were made
                            if (functionCalls.length > 0) {
                                const functionList = functionCalls.map(fn => fn.replace(/_/g, ' ')).join(', ');
                                fullContent += `\n\n${t('I called the following functions')}: **${functionList}**\n\n${t('However, I was unable to generate a proper response with the results. Please try rephrasing your question or ask me to explain what I found.')}`;
                            } else {
                                fullContent = t('I apologize, but I was unable to generate a proper response. This might be due to a processing issue. Please try rephrasing your question or try again.');
                            }
                        }

                        updateMessage(agentMessageId, {
                            content: fullContent,
                            streaming: false,
                            sources,
                            functionCalls,
                            model,
                            toolsUsed,
                            tokensUsed,
                            totalDuration,
                            conversationId: conversationIdFromResponse
                        });
                    } else if (chunk.type === 'error') {
                        console.error('[AIChatOverlay] Streaming error:', chunk.error);

                        // Check if we should fall back to non-streaming
                        if (chunk.error?.includes('temporarily unavailable') || chunk.error?.includes('not supported')) {
                            console.log('Streaming not available, falling back to non-streaming...');
                            streamingFailed = true;
                            break;
                        }

                        // Show user-friendly error message
                        const errorMessage = chunk.error || 'I encountered an issue processing your request. Please try again.';

                        updateMessage(agentMessageId, {
                            content: `⚠️ ${errorMessage}`,
                            streaming: false
                        });
                        break; // Stop processing stream
                    }
                }

                // Ensure final content is displayed even if loop ended before 'done' chunk
                if (!streamingFailed && fullContent && updateCounter > 0) {
                    // Validate content before final update
                    const contentWithoutNotifications = fullContent.replace(/\n\n🔧 \*\*Executing:.*?\*\*\n\n/g, '').trim();

                    if (!contentWithoutNotifications || contentWithoutNotifications.length < 10) {
                        console.warn('[AIChatOverlay] Stream ended without done chunk and content is empty/short:', {
                            fullContentLength: fullContent.length,
                            contentWithoutNotifications: contentWithoutNotifications.length
                        });

                        // Mention function calls if they were made
                        if (functionCalls.length > 0) {
                            const functionList = functionCalls.map(fn => fn.replace(/_/g, ' ')).join(', ');
                            fullContent += `\n\n${t('I called the following functions')}: **${functionList}**\n\n${t('However, I was unable to generate a proper response with the results. Please try rephrasing your question.')}`;
                        } else {
                            fullContent = t('I apologize, but I was unable to generate a proper response. Please try again.');
                        }
                    }

                    updateMessage(agentMessageId, {
                        content: fullContent,
                        streaming: false,
                        sources,
                        functionCalls,
                        model,
                        toolsUsed,
                        tokensUsed,
                        totalDuration,
                        conversationId: conversationIdFromResponse
                    });
                }

                // Fallback to non-streaming if streaming failed
                if (streamingFailed) {
                    const assistantResponse = await aiAssistant.generateResponse(userMessage.content, conversationId || undefined, selectedModel);
                    // Verbose logging: log full non-streaming response object
                    try {
                        console.log('[AIChatOverlay] Non-streaming assistantResponse (all fields):', assistantResponse);
                    } catch {
                        // best-effort logging
                    }

                    updateMessage(agentMessageId, {
                        content: assistantResponse.answer,
                        sources: assistantResponse.sources,
                        model: assistantResponse.model,
                        toolsUsed: assistantResponse.toolsUsed,
                        tokensUsed: assistantResponse.tokensUsed,
                        totalDuration: assistantResponse.totalDuration,
                        conversationId: assistantResponse.conversationId,
                        streaming: false
                    });
                }
            } else {
                // Non-streaming mode - wait for complete response
                const assistantResponse = await aiAssistant.generateResponse(userMessage.content, conversationId || undefined, selectedModel);

                // Verbose logging
                try {
                    console.log('[AIChatOverlay] Non-streaming response (all fields):', assistantResponse);
                } catch {
                    // best-effort logging
                }

                updateMessage(agentMessageId, {
                    content: assistantResponse.answer,
                    sources: assistantResponse.sources,
                    model: assistantResponse.model,
                    toolsUsed: assistantResponse.toolsUsed,
                    tokensUsed: assistantResponse.tokensUsed,
                    totalDuration: assistantResponse.totalDuration,
                    conversationId: assistantResponse.conversationId,
                    streaming: false
                });
            }
        } catch (error) {
            console.error('Error getting AI response:', error);

            // Determine user-friendly error message
            let errorMessage = t('I\'m sorry, I\'m having trouble processing your request right now. Please try again.');

            if (error instanceof Error) {
                const errorStr = error.message.toLowerCase();
                if (errorStr.includes('timeout') || errorStr.includes('timed out')) {
                    errorMessage = t('The request took too long to complete. Please try again with a shorter question.');
                } else if (errorStr.includes('network') || errorStr.includes('fetch')) {
                    errorMessage = t('Unable to connect to the AI service. Please check your connection and try again.');
                }
            }

            // Update the placeholder with user-friendly error message
            updateMessage(agentMessageId, {
                content: `⚠️ ${errorMessage}`,
                streaming: false
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Helper to log during JSX construction
    const logJsx = (section: string) => {
        console.log(`🔍 AIChatOverlay JSX: ${section}`);
        return null;
    };
    
    return (
        <>
            {/* Floating Chat Button - only show when chat is closed */}
            {!isOpen && (
                <div className="fixed bottom-4 right-4 z-[50]">
                    {logJsx('inside floating button')}
                    <Button
                        onClick={() => handleSetOpen(true)}
                        className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-2xl border border-primary/20 transition-all duration-300 hover:scale-105"
                        title={t('Open AI Assistant')}
                    >
                        {isOpenAIReady ? (
                            <Brain className="w-6 h-6 text-primary-foreground" />
                        ) : (
                            <Bot className="w-6 h-6 text-primary-foreground" />
                        )}
                    </Button>
                </div>
            )}

            {/* Chat Overlay */}
            {isOpen && (
                <div className={`fixed z-[60] transition-all duration-300 ${isExpanded ? 'top-4 bottom-4' : 'bottom-4 h-auto'
                    } ${isFullWidth ? 'left-4 right-4' : 'right-4 w-96 max-w-[calc(100vw-2rem)]'
                    }`}>
                    <Card className="bg-card/95 backdrop-blur-xl border border-border/60 shadow-2xl rounded-2xl overflow-hidden relative" style={isExpanded ? { height: '100%' } : {}}>
                        {/* Vertical Expand Handle - Invisible until hover */}
                        {!isExpanded && (
                            <div
                                onClick={() => {
                                    setIsExpanded(true);
                                    setIsMinimized(false); // Also open the chat
                                }}
                                className="absolute top-0 left-0 right-0 h-3 cursor-ns-resize group z-10"
                                title={t('Expand to full height')}
                            >
                                <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/0 group-hover:bg-primary/60 transition-all duration-200" />
                                <div className="absolute inset-x-0 top-1 h-px bg-primary/0 group-hover:bg-primary/40 transition-all duration-200" />
                            </div>
                        )}

                        {/* Corner Expand Handle - Top-left corner for full expansion */}
                        {!isExpanded && !isFullWidth && (
                            <div
                                onClick={() => {
                                    setIsExpanded(true);
                                    setIsFullWidth(true);
                                    setIsMinimized(false); // Also open the chat
                                }}
                                className="absolute top-0 left-0 w-8 h-8 cursor-nwse-resize group z-20"
                                title={t('Expand to full screen')}
                            >
                                <div className="absolute top-0 left-0 w-6 h-0.5 bg-primary/0 group-hover:bg-primary/70 transition-all duration-200" />
                                <div className="absolute top-0 left-0 w-0.5 h-6 bg-primary/0 group-hover:bg-primary/70 transition-all duration-200" />
                                <div className="absolute top-1 left-1 w-4 h-0.5 bg-primary/0 group-hover:bg-primary/50 transition-all duration-200" />
                                <div className="absolute top-1 left-1 w-0.5 h-4 bg-primary/0 group-hover:bg-primary/50 transition-all duration-200" />
                            </div>
                        )}

                        {/* Vertical Collapse Handle - Shows when expanded */}
                        {isExpanded && !isFullWidth && (
                            <div
                                onClick={() => setIsExpanded(false)}
                                className="absolute top-0 left-0 right-0 h-3 cursor-ns-resize group z-10"
                                title={t('Collapse to normal size')}
                            >
                                <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/40 group-hover:bg-primary/60 transition-all duration-200" />
                                <div className="absolute inset-x-0 top-1 h-px bg-primary/20 group-hover:bg-primary/40 transition-all duration-200" />
                            </div>
                        )}

                        {/* Horizontal Expand Handle - Only shows when vertically expanded */}
                        {isExpanded && !isFullWidth && (
                            <div
                                onClick={() => {
                                    setIsFullWidth(true);
                                    setIsMinimized(false); // Also open the chat
                                }}
                                className="absolute top-0 bottom-0 left-0 w-3 cursor-ew-resize group z-10"
                                title={t('Expand to full width')}
                            >
                                <div className="absolute inset-y-0 left-0 w-0.5 bg-primary/0 group-hover:bg-primary/60 transition-all duration-200" />
                                <div className="absolute inset-y-0 left-1 w-px bg-primary/0 group-hover:bg-primary/40 transition-all duration-200" />
                            </div>
                        )}

                        {/* Full Width Collapse Handle - Shows when full width */}
                        {isFullWidth && (
                            <div
                                onClick={() => setIsFullWidth(false)}
                                className="absolute top-0 bottom-0 left-0 w-3 cursor-ew-resize group z-10"
                                title={t('Collapse width')}
                            >
                                <div className="absolute inset-y-0 left-0 w-0.5 bg-primary/40 group-hover:bg-primary/60 transition-all duration-200" />
                                <div className="absolute inset-y-0 left-1 w-px bg-primary/20 group-hover:bg-primary/40 transition-all duration-200" />
                            </div>
                        )}

                        {/* Collapse All Handle - Shows when full width */}
                        {isFullWidth && (
                            <div
                                onClick={() => {
                                    setIsFullWidth(false);
                                    setIsExpanded(false);
                                }}
                                className="absolute top-0 left-0 right-0 h-3 cursor-ns-resize group z-10"
                                title={t('Collapse to normal size')}
                            >
                                <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/40 group-hover:bg-primary/60 transition-all duration-200" />
                                <div className="absolute inset-x-0 top-1 h-px bg-primary/20 group-hover:bg-primary/40 transition-all duration-200" />
                            </div>
                        )}

                        <ChatHeader
                            isMinimized={isMinimized}
                            isOpenAIReady={isOpenAIReady}
                            selectedModel={selectedModel}
                            streamingEnabled={streamingEnabled}
                            isProcessing={isProcessing}
                            showSettings={showSettings}
                            onHeaderClick={handleHeaderClick}
                            onSettingsClick={handleSettingsClick}
                            onSettingsKeyDown={handleSettingsKeyDown}
                            onRetryConnection={handleRetryConnection}
                            onClearChat={handleClearChat}
                            onClose={onClose}
                            onModelChange={setSelectedModel}
                            onStreamingToggle={() => setStreamingEnabled(!streamingEnabled)}
                        />

                        {!isMinimized && (
                            <ChatContent
                                isExpanded={isExpanded}
                                chatMessages={chatMessages}
                                isProcessing={isProcessing}
                                isReasoning={isReasoning}
                                reasoningText={reasoningText}
                                isSummarizing={isSummarizing}
                                isListening={isListening}
                                currentMessage={currentMessage}
                                messagesContainerRef={messagesContainerRef}
                                messagesEndRef={messagesEndRef}
                                onSendMessage={handleSendMessage}
                                onCurrentMessageChange={setCurrentMessage}
                                onMicToggle={handleMicToggle}
                            />
                        )}
                    </Card>
                </div>
            )}
        </>
    );
}

