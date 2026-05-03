import { useTranslation } from 'react-i18next';
import { Button } from '@max-health-inc/shared-ui';
import { Switch } from '../ui/switch';
import { AVAILABLE_MODELS } from './constants';

interface ChatSettingsProps {
    isOpen: boolean;
    selectedModel: string;
    streamingEnabled: boolean;
    onModelChange: (modelId: string) => void;
    onStreamingToggle: () => void;
    onClickOutside: (event: React.MouseEvent) => void;
}

export function ChatSettings({
    isOpen,
    selectedModel,
    streamingEnabled,
    onModelChange,
    onStreamingToggle,
    onClickOutside,
}: ChatSettingsProps) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div
            className="settings-dropdown absolute right-0 mt-2 w-72 bg-popover border border-border rounded-lg shadow-lg p-3 z-50"
            onClick={onClickOutside}
        >
            <div className="space-y-3">
                {/* Model Selection */}
                <div>
                    <label className="text-xs font-medium text-foreground mb-1.5 block">{t('AI Model')}</label>
                    <div className="space-y-1">
                        {AVAILABLE_MODELS.map((model) => (
                            <Button
                                key={model.id}
                                variant={selectedModel === model.id ? 'default' : 'ghost'}
                                onClick={() => onModelChange(model.id)}
                                className={`w-full justify-start text-left h-auto px-2.5 py-2 text-xs`}
                            >
                                <div>
                                    <div className="font-medium">{model.name}</div>
                                    <div
                                        className={`text-[10px] mt-0.5 ${
                                            selectedModel === model.id
                                                ? 'text-primary-foreground/80'
                                                : 'text-muted-foreground'
                                        }`}
                                    >
                                        {model.description}
                                    </div>
                                </div>
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Streaming Toggle */}
                <div className="pt-2 border-t border-border">
                    <label className="flex items-center justify-between cursor-pointer">
                        <div>
                            <div className="text-xs font-medium text-foreground">{t('Streaming')}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                                {t('Real-time response streaming')}
                            </div>
                        </div>
                        <Switch
                            checked={streamingEnabled}
                            onCheckedChange={() => onStreamingToggle()}
                            size="sm"
                        />
                    </label>
                </div>
            </div>
        </div>
    );
}
