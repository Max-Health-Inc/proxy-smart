import { useState } from 'react';
import { FileText, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ActionMarkdownRenderer } from './ActionMarkdownRenderer';
import type { ChatMessage as ChatMessageType } from '../../lib/ai-assistant';
import type { DocumentChunk, ToolExecution } from '../../lib/api-client';

interface ChatMessageProps {
    message: ChatMessageType;
    isProcessing?: boolean;
    onActionComplete?: (actionType: string, result: unknown) => void;
}

export function ChatMessage({ message, isProcessing, onActionComplete }: ChatMessageProps) {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!message.content) return;
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[80%] p-3 rounded-lg text-sm ${
                    message.type === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                }`}
            >
                {message.type === 'agent' ? (
                    message.content ? (
                        <ActionMarkdownRenderer
                            content={message.content}
                            streaming={message.streaming || false}
                            onActionComplete={(actionType, result) => {
                                console.log('Action completed:', actionType, result);
                                onActionComplete?.(actionType, result);
                            }}
                        />
                    ) : !isProcessing ? (
                        <span className="text-muted-foreground italic">
                            {t('(Empty response - this should not happen)')}
                        </span>
                    ) : null
                ) : (
                    <div className="whitespace-pre-wrap">{message.content || t('(Empty message)')}</div>
                )}

                {/* Show sources for agent messages */}
                {message.type === 'agent' && message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-border/20">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                            <FileText className="w-3 h-3" />
                            <span>{t('Sources')}:</span>
                        </div>
                        <div className="space-y-1">
                            {message.sources.slice(0, 3).map((source: DocumentChunk, index: number) => (
                                <div key={index} className="text-xs p-2 bg-background/50 rounded border border-border/30">
                                    <div className="font-medium truncate">{source.title}</div>
                                    <div className="text-muted-foreground truncate text-[10px] mt-0.5">
                                        {source.content.substring(0, 100)}...
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Show metadata (model, tokens, duration, tools) for agent messages */}
                {message.type === 'agent' &&
                    (message.model || message.totalDuration || message.tokensUsed || message.toolsUsed?.length) && (
                        <div className="mt-3 pt-2 border-t border-border/20">
                            <details className="group">
                                <summary className="cursor-pointer text-xs text-muted-foreground mb-2 hover:text-foreground transition-colors">
                                    📊 {t('Response Details')}
                                </summary>
                                <div className="space-y-1 text-xs text-muted-foreground mt-2">
                                    {message.model && (
                                        <div className="flex items-center justify-between">
                                            <span>{t('Model')}:</span>
                                            <span className="font-mono text-foreground">{message.model}</span>
                                        </div>
                                    )}
                                    {message.totalDuration !== undefined && (
                                        <div className="flex items-center justify-between">
                                            <span>{t('Duration')}:</span>
                                            <span className="font-mono text-foreground">
                                                {(message.totalDuration / 1000).toFixed(2)}s
                                            </span>
                                        </div>
                                    )}
                                    {message.tokensUsed && (
                                        <div className="flex items-center justify-between">
                                            <span>{t('Tokens')}:</span>
                                            <div className="flex gap-2 font-mono text-foreground">
                                                <span title={t('Prompt tokens')}>↓{message.tokensUsed.inputTokens || 0}</span>
                                                <span title={t('Completion tokens')}>↑{message.tokensUsed.outputTokens || 0}</span>
                                                {message.tokensUsed.reasoningTokens !== undefined && (
                                                    <span title={t('Reasoning tokens')}>
                                                        🧠{message.tokensUsed.reasoningTokens}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {message.toolsUsed && message.toolsUsed.length > 0 && (
                                        <div className="pt-1 border-t border-border/20 mt-2">
                                            <div className="font-medium mb-1">{t('Tools Used')}:</div>
                                            {message.toolsUsed.map((tool: ToolExecution, idx: number) => (
                                                <div key={idx} className="ml-2 mb-1">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-primary">•</span>
                                                        <span className="font-mono text-foreground">{tool.toolName}</span>
                                                    </div>
                                                    {tool.duration && (
                                                        <div className="ml-3 text-[10px]">
                                                            {t('Duration')}: {(tool.duration / 1000).toFixed(2)}s
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </details>
                        </div>
                    )}

                {/* Copy button */}
                {message.content && !message.streaming && (
                    <div className={`flex ${message.type === 'user' ? 'justify-start' : 'justify-end'} mt-1.5`}>
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                            title={t('Copy message')}
                        >
                            {copied ? (
                                <><Check className="w-3 h-3" />{t('Copied')}</>
                            ) : (
                                <><Copy className="w-3 h-3" />{t('Copy')}</>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
