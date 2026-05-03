import React from 'react';
import { Brain, Loader2, Mic, MicOff, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, CardContent, Input } from '@max-health-inc/shared-ui';
import { ChatMessage as ChatMessageComponent } from './ChatMessage';
import type { ChatMessage } from '../../lib/ai-assistant';

interface ChatContentProps {
    isExpanded: boolean;
    chatMessages: ChatMessage[];
    isProcessing: boolean;
    isReasoning: boolean;
    reasoningText: string;
    isSummarizing: boolean;
    isListening: boolean;
    currentMessage: string;
    messagesContainerRef: React.RefObject<HTMLDivElement | null>;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    onSendMessage: (e: React.FormEvent) => Promise<void>;
    onCurrentMessageChange: (message: string) => void;
    onMicToggle: () => void;
}

export function ChatContent({
    isExpanded,
    chatMessages,
    isProcessing,
    isReasoning,
    reasoningText,
    isSummarizing,
    isListening,
    currentMessage,
    messagesContainerRef,
    messagesEndRef,
    onSendMessage,
    onCurrentMessageChange,
    onMicToggle,
}: ChatContentProps) {
    const { t } = useTranslation();

    // Only render the last N messages; increase by 10 when user scrolls to top
    const [visibleCount, setVisibleCount] = React.useState(10);
    const prevLengthRef = React.useRef(0);
    const pendingScrollRestore = React.useRef<null | { prevHeight: number; prevTop: number }>(null);
    const loadingMoreRef = React.useRef(false);
    const [isLoadingOlder, setIsLoadingOlder] = React.useState(false);

    // Detect conversation reset (message list shrinks) and reset to last 10
    React.useEffect(() => {
        const len = chatMessages.length;
        if (len < prevLengthRef.current) {
            setVisibleCount(Math.min(10, len));
            setIsLoadingOlder(false);
        } else if (prevLengthRef.current === 0 && len > 0) {
            // Initial load
            setVisibleCount(Math.min(10, len));
            setIsLoadingOlder(false);
        }
        prevLengthRef.current = len;
    }, [chatMessages]);

    // Keep scroll position stable when we prepend older messages
    React.useLayoutEffect(() => {
        if (!pendingScrollRestore.current) return;
        const el = messagesContainerRef.current;
        if (!el) {
            pendingScrollRestore.current = null;
            loadingMoreRef.current = false;
            return;
        }
        const { prevHeight, prevTop } = pendingScrollRestore.current;
        const newHeight = el.scrollHeight;
        el.scrollTop = newHeight - prevHeight + prevTop;
        pendingScrollRestore.current = null;
        loadingMoreRef.current = false;
        setIsLoadingOlder(false);
    }, [visibleCount, messagesContainerRef]);

    const handleScroll = React.useCallback(() => {
        const el = messagesContainerRef.current;
        if (!el) return;
        const TOP_THRESHOLD = 24; // px
        if (el.scrollTop <= TOP_THRESHOLD && !loadingMoreRef.current) {
            // Can we load more?
            if (visibleCount < chatMessages.length) {
                loadingMoreRef.current = true;
                setIsLoadingOlder(true);
                pendingScrollRestore.current = {
                    prevHeight: el.scrollHeight,
                    prevTop: el.scrollTop,
                };
                setVisibleCount((c) => Math.min(c + 10, chatMessages.length));
            }
        }
    }, [messagesContainerRef, visibleCount, chatMessages.length]);

    const startIndex = Math.max(0, chatMessages.length - visibleCount);
    const visibleMessages = chatMessages.slice(startIndex);
    const hasMoreAbove = visibleCount < chatMessages.length;

    return (
        <CardContent className="p-0" style={isExpanded ? { display: 'flex', flexDirection: 'column', height: 'calc(100% - 76px)' } : {}}>
            {/* Chat Messages */}
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="overflow-y-auto p-4 space-y-3"
                style={isExpanded ? { flex: 1 } : { height: '256px' }}
            >
                {hasMoreAbove && (
                    <div className="flex justify-center">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                            {isLoadingOlder ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <span>{t('Scroll up to load earlier messages')}</span>
                            )}
                        </div>
                    </div>
                )}
                {visibleMessages.map((message) => (
                    <ChatMessageComponent
                        key={message.id}
                        message={message}
                        isProcessing={isProcessing}
                        onActionComplete={(actionType, result) => {
                            console.log('Action completed:', actionType, result);
                        }}
                    />
                ))}

                {/* Processing indicator */}
                {(isProcessing || isReasoning || isSummarizing) && (
                    <div className="flex justify-start">
                        <div className="bg-muted text-foreground p-3 rounded-lg rounded-bl-sm text-sm max-w-xl">
                            {isSummarizing ? (
                                <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="font-medium">{t('Summarizing conversation')}...</span>
                                </div>
                            ) : isReasoning && reasoningText ? (
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                                        <Brain className="w-4 h-4 animate-pulse" />
                                        <span className="font-medium">{t('Reasoning')}...</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground italic whitespace-pre-wrap border-l-2 border-amber-500/30 pl-2">
                                        {reasoningText}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    <span>{t('Assistant is thinking')}...</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Invisible div at the end for auto-scroll */}
                <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="border-t border-border/50 p-4">
                <form onSubmit={onSendMessage} className="flex space-x-2">
                    <Input
                        value={currentMessage}
                        onChange={(e) => onCurrentMessageChange(e.target.value)}
                        placeholder={t('Ask me about SMART on FHIR...')}
                        className="flex-1 text-sm rounded-lg border-input focus:border-ring focus:ring-ring"
                        disabled={isProcessing}
                    />
                    <Button
                        type="button"
                        size="sm"
                        onClick={onMicToggle}
                        variant={isListening ? 'destructive' : 'secondary'}
                        className={`rounded-lg px-3 transition-all duration-300 ${isListening ? 'animate-pulse' : ''}`}
                        disabled={isProcessing}
                        title={isListening ? t('Stop listening') : t('Start voice input')}
                    >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </Button>
                    <Button
                        type="submit"
                        size="sm"
                        disabled={isProcessing || !currentMessage.trim()}
                        className={`rounded-lg px-3 transition-all duration-300 ${isProcessing ? 'animate-pulse' : ''}`}
                        title={t('Send message')}
                    >
                        {isProcessing ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </Button>
                </form>
            </div>
        </CardContent>
    );
}
