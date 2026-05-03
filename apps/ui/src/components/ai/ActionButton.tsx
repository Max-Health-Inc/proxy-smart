import React, { useCallback, useState } from 'react';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@max-health-inc/shared-ui';
import {
    ExternalLink,
    RefreshCw,
    Send,
    ChevronRight,
    CheckCircle,
    XCircle,
    Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/appStore';
import { getStoredToken } from '@/lib/apiClient';
import { config } from '@/config';

// Action types that the AI can suggest
export type ActionType = 'navigate' | 'refresh' | 'api-call' | 'form' | 'external-link';

export interface ActionConfig {
    type: ActionType;
    label: string;
    target?: string; // For navigation or external links
    tab?: string; // For navigation to specific tabs
    endpoint?: string; // For API calls
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; // For API calls
    fields?: Array<{
        name: string;
        label: string;
        type: 'text' | 'email' | 'number' | 'select';
        placeholder?: string;
        required?: boolean;
        options?: string[]; // For select fields
    }>; // For forms
    confirmMessage?: string; // Optional confirmation before action
}

interface ActionButtonProps {
    action: ActionConfig;
    onComplete?: (result: unknown) => void;
    compact?: boolean;
    formOpen?: boolean;
    onFormOpenChange?: (open: boolean) => void;
}

export function ActionButton({ action, onComplete, compact = false, formOpen, onFormOpenChange }: ActionButtonProps) {
    const { t } = useTranslation();
    const { setActiveTab } = useAppStore();
    const [isExecuting, setIsExecuting] = useState(false);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null);

    const [internalShowForm, setInternalShowForm] = useState(false);
    const isControlled = formOpen !== undefined;
    const showForm = isControlled ? formOpen ?? false : internalShowForm;

    const setShowFormState = useCallback(
        (open: boolean) => {
            if (isControlled) {
                onFormOpenChange?.(open);
            } else {
                setInternalShowForm(open);
            }
        },
        [isControlled, onFormOpenChange]
    );

    const handleNavigate = () => {
        if (action.tab) {
            setActiveTab(action.tab);
            window.location.hash = action.tab;
            setResult({ success: true, message: t('Navigated successfully') });
            onComplete?.({ navigated: true, tab: action.tab });
        } else if (action.target) {
            window.location.hash = action.target;
            setResult({ success: true, message: t('Navigated successfully') });
            onComplete?.({ navigated: true, target: action.target });
        }
    };

    const handleRefresh = async () => {
        setIsExecuting(true);
        try {
            // Trigger a page refresh or specific component refresh
            window.location.reload();
        } finally {
            setIsExecuting(false);
        }
    };

    const handleExternalLink = () => {
        if (action.target) {
            window.open(action.target, '_blank', 'noopener,noreferrer');
            setResult({ success: true, message: t('Opened in new tab') });
            onComplete?.({ opened: true, url: action.target });
        }
    };

    const handleApiCall = async () => {
        if (!action.endpoint) return;

        if (action.confirmMessage && !window.confirm(action.confirmMessage)) {
            return;
        }

        setIsExecuting(true);
        setResult(null);

        try {
            const token = await getStoredToken();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${config.api.baseUrl}${action.endpoint}`, {
                method: action.method || 'GET',
                headers,
                body: action.method !== 'GET' ? JSON.stringify(formData) : undefined,
            });

            if (response.ok) {
                const data = await response.json();
                setResult({ success: true, message: t('Request completed successfully') });
                onComplete?.(data);
                setShowFormState(false);
            } else {
                setResult({ success: false, message: t('Request failed') });
                onComplete?.({ error: true, status: response.status });
            }
        } catch (error) {
            console.error('API call error:', error);
            setResult({ success: false, message: t('Network error') });
            onComplete?.({ error: true, message: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
            setIsExecuting(false);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate required fields
        const missingFields = action.fields?.filter(field => 
            field.required && !formData[field.name]
        ) || [];

        if (missingFields.length > 0) {
            alert(t('Please fill in all required fields'));
            return;
        }

        if (action.type === 'api-call') {
            handleApiCall();
        } else {
            onComplete?.(formData);
            setShowFormState(false);
            setResult({ success: true, message: t('Form submitted') });
        }
    };

    const renderButton = () => {
        switch (action.type) {
            case 'navigate':
                return (
                    <Button
                        size={compact ? 'sm' : 'default'}
                        onClick={handleNavigate}
                        className="gap-2"
                        variant="default"
                    >
                        <ChevronRight className="w-4 h-4" />
                        {action.label}
                    </Button>
                );

            case 'refresh':
                return (
                    <Button
                        size={compact ? 'sm' : 'default'}
                        onClick={handleRefresh}
                        disabled={isExecuting}
                        className="gap-2"
                        variant="outline"
                    >
                        <RefreshCw className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`} />
                        {action.label}
                    </Button>
                );

            case 'external-link':
                return (
                    <Button
                        size={compact ? 'sm' : 'default'}
                        onClick={handleExternalLink}
                        className="gap-2"
                        variant="outline"
                    >
                        <ExternalLink className="w-4 h-4" />
                        {action.label}
                    </Button>
                );

            case 'api-call':
                return (
                    <Button
                        size={compact ? 'sm' : 'default'}
                        onClick={action.fields ? () => setShowFormState(true) : handleApiCall}
                        disabled={isExecuting}
                        className="gap-2"
                        variant="default"
                    >
                        {isExecuting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        {action.label}
                    </Button>
                );

            case 'form':
                return (
                    <Button
                        size={compact ? 'sm' : 'default'}
                        onClick={() => setShowFormState(true)}
                        className="gap-2"
                        variant="default"
                    >
                        <Send className="w-4 h-4" />
                        {action.label}
                    </Button>
                );

            default:
                return null;
        }
    };

    return (
        <div className="my-2">
            {/* Action Button */}
            <div className="flex items-center gap-2">
                {renderButton()}
                
                {/* Result indicator */}
                {result && (
                    <div className="flex items-center gap-1 text-xs">
                        {result.success ? (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                        ) : (
                            <XCircle className="w-3 h-3 text-red-600" />
                        )}
                        <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                            {result.message}
                        </span>
                    </div>
                )}
            </div>

            {/* Form Modal */}
            {showForm && action.fields && (
                <div className="mt-3 p-3 border border-border rounded-lg bg-background/50">
                    <form onSubmit={handleFormSubmit} className="space-y-3">
                        {action.fields.map((field) => (
                            <div key={field.name} className="space-y-1">
                                <Label htmlFor={field.name} className="text-xs font-medium">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                </Label>
                                {field.type === 'select' && field.options ? (
                                    <Select
                                        value={formData[field.name] || undefined}
                                        onValueChange={(value: string) => setFormData({ ...formData, [field.name]: value })}
                                        required={field.required}
                                    >
                                        <SelectTrigger className="text-sm">
                                            <SelectValue placeholder={t('Select an option')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {field.options.map((option) => (
                                                <SelectItem key={option} value={option}>
                                                    {option}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input
                                        id={field.name}
                                        type={field.type}
                                        placeholder={field.placeholder}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                        className="text-sm"
                                        required={field.required}
                                    />
                                )}
                            </div>
                        ))}
                        <div className="flex gap-2 pt-2">
                            <Button type="submit" size="sm" disabled={isExecuting}>
                                {isExecuting ? (
                                    <>
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                        {t('Processing')}...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-3 h-3 mr-1" />
                                        {t('Submit')}
                                    </>
                                )}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setShowFormState(false)}
                            >
                                {t('Cancel')}
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
