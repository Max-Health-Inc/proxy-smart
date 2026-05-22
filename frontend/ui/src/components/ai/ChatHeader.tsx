import { Brain, Bot, RotateCcw, RefreshCw, X, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@proxy-smart/shared-ui';
import { ChatSettings } from './ChatSettings';
import { AVAILABLE_MODELS } from './constants';

interface ChatHeaderProps {
    isMinimized: boolean;
    isOpenAIReady: boolean;
    selectedModel: string;
    streamingEnabled: boolean;
    isProcessing: boolean;
    showSettings: boolean;
    onHeaderClick: () => void;
    onSettingsClick: (event: React.MouseEvent<HTMLDivElement>) => void;
    onSettingsKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
    onRetryConnection: () => Promise<void>;
    onClearChat: () => void;
    onClose: () => void;
    onModelChange: (modelId: string) => void;
    onStreamingToggle: () => void;
}

export function ChatHeader({
    isMinimized,
    isOpenAIReady,
    selectedModel,
    streamingEnabled,
    isProcessing,
    showSettings,
    onHeaderClick,
    onSettingsClick,
    onSettingsKeyDown: _onSettingsKeyDown,
    onRetryConnection,
    onClearChat,
    onClose,
    onModelChange,
    onStreamingToggle,
}: ChatHeaderProps) {
    const { t } = useTranslation();

    return (
        <div
            className="bg-muted/50 p-4 border-b border-border/50 cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={onHeaderClick}
            title={isMinimized ? t('Expand chat') : t('Minimize chat')}
        >
            <div className="flex items-center justify-between">
                {/* Left: Icon and Status */}
                <div className="flex items-center space-x-3 select-none">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-sm">
                        {isOpenAIReady ? (
                            <Brain className="w-4 h-4 text-primary-foreground" />
                        ) : (
                            <Bot className="w-4 h-4 text-primary-foreground" />
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <div>
                            <p className="text-xs text-muted-foreground">
                                {isOpenAIReady ? t('AI Assistant') : t('AI Assistant unavailable')}
                            </p>
                            {!isMinimized && isOpenAIReady && (
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-[9px] text-muted-foreground/70 font-mono">
                                        {AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name || selectedModel}
                                    </span>
                                    {streamingEnabled && <span className="text-[9px] text-primary/70">• Stream</span>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="flex items-center space-x-1">
                    {/* Retry Connection Button */}
                    {!isMinimized && !isOpenAIReady && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRetryConnection();
                            }}
                            disabled={isProcessing}
                            className="h-6 w-6 p-0 hover:bg-muted rounded-md"
                            title={t('Retry connection to MCP server')}
                        >
                            <RefreshCw className={`w-3 h-3 text-amber-600 ${isProcessing ? 'animate-spin' : ''}`} />
                        </Button>
                    )}

                    {/* Connection Status */}
                    <div className="flex items-center space-x-1">
                        <div
                            className={`w-1.5 h-1.5 rounded-full ${isOpenAIReady ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}
                        />
                        <span className="text-[10px] text-muted-foreground">
                            {isOpenAIReady ? t('Connected') : t('Limited')}
                        </span>
                    </div>

                    {/* Settings Button + Dropdown */}
                    {!isMinimized && (
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSettingsClick(e as unknown as React.MouseEvent<HTMLDivElement>);
                                }}
                                className="h-6 w-6 p-0 hover:bg-muted rounded-md"
                                title={t('Settings')}
                            >
                                <Settings className="w-3 h-3 text-muted-foreground" />
                            </Button>
                            <ChatSettings
                                isOpen={showSettings}
                                selectedModel={selectedModel}
                                streamingEnabled={streamingEnabled}
                                onModelChange={onModelChange}
                                onStreamingToggle={onStreamingToggle}
                                onClickOutside={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}

                    {/* Clear Chat Button */}
                    {!isMinimized && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClearChat();
                            }}
                            className="h-6 w-6 p-0 hover:bg-muted rounded-md"
                            title={t('Clear chat history')}
                        >
                            <RotateCcw className="w-3 h-3 text-muted-foreground" />
                        </Button>
                    )}

                    {/* Close Button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        className="h-6 w-6 p-0 hover:bg-muted rounded-md"
                        title={t('Close chat')}
                    >
                        <X className="w-3 h-3 text-muted-foreground" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
