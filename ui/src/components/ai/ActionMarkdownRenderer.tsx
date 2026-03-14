import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ActionButton, type ActionConfig } from './ActionButton';

interface ActionMarkdownRendererProps {
    content: string;
    streaming?: boolean;
    onActionComplete?: (actionType: string, result: unknown) => void;
}

// Helper to extract plain text from React children tree
function extractText(node: unknown): string {
    if (node == null) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (typeof node === 'object' && node !== null && 'props' in (node as Record<string, unknown>)) {
        const props = (node as Record<string, unknown>).props as { children?: unknown } | undefined;
        if (props && 'children' in props) {
            return extractText(props.children);
        }
    }
    return '';
}

// Check if children contain action placeholders and split into segments
function splitActionSegments(children: React.ReactNode): Array<{ type: 'text' | 'action'; value: string }> | null {
    const childText = extractText(children);
    const re = /\{\{ACTION_([^}]+)\}\}/g;
    if (!re.test(childText)) return null;

    re.lastIndex = 0;
    const segments: Array<{ type: 'text' | 'action'; value: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(childText)) !== null) {
        const [full, id] = match;
        if (match.index > lastIndex) {
            segments.push({ type: 'text', value: childText.slice(lastIndex, match.index) });
        }
        segments.push({ type: 'action', value: id });
        lastIndex = match.index + full.length;
    }
    if (lastIndex < childText.length) {
        segments.push({ type: 'text', value: childText.slice(lastIndex) });
    }
    return segments;
}

/**
 * Custom markdown renderer that supports interactive action buttons.
 * 
 * Renders full markdown during both streaming and completed states using react-markdown.
 * Actions are only parsed when streaming is complete.
 * 
 * Syntax examples:
 *   [action:navigate:Go to SMART Apps:smart-apps]
 *   [action:refresh:Refresh Data]
 *   [action:external:View Documentation:https://docs.example.com]
 *   [action:api:Create User:POST:/admin/users:name|text|User Name|true,email|email|Email|true]
 *   [action:form:Label:field1|type|label|required,field2|...]
 */
export function ActionMarkdownRenderer({ content, streaming = false, onActionComplete }: ActionMarkdownRendererProps) {
    const [openForms, setOpenForms] = React.useState<Record<string, boolean>>({});

    // Parse action syntax from markdown — skip while streaming for performance
    const { processedContent, actions } = React.useMemo(() => {
        if (streaming) {
            return { processedContent: content, actions: [] as Array<{ original: string; action: ActionConfig; id: string }> };
        }

        const actionRegex = /\[action:(navigate|refresh|api|external|form):([^\]]+)\]/gi;
        const actions: Array<{ original: string; action: ActionConfig; id: string }> = [];
        let match;
        let counter = 0;

        while ((match = actionRegex.exec(content)) !== null) {
            const [fullMatch, rawType, params] = match;
            const type = rawType.toLowerCase();
            const parts = params.split(':');
            const id = `action-${counter++}`;

            try {
                let action: ActionConfig | null = null;

                switch (type) {
                    case 'navigate':
                        if (parts.length >= 2) {
                            action = { type: 'navigate', label: parts[0], tab: parts[1] };
                        }
                        break;
                    case 'refresh':
                        action = { type: 'refresh', label: parts[0] || 'Refresh' };
                        break;
                    case 'external':
                        if (parts.length >= 2) {
                            action = { type: 'external-link', label: parts[0], target: parts[1] };
                        }
                        break;
                    case 'api':
                        if (parts.length >= 3) {
                            const fields = parts[3] ? parts[3].split(',').map(fieldStr => {
                                const [name, ftype, label, required, options] = fieldStr.split('|');
                                return {
                                    name: name.trim(),
                                    type: (ftype?.trim() as 'text' | 'email' | 'number' | 'select') || 'text',
                                    label: label?.trim() || name.trim(),
                                    required: required?.trim() === 'true',
                                    options: options?.split(';').map(o => o.trim()),
                                };
                            }) : undefined;
                            action = {
                                type: 'api-call', label: parts[0],
                                method: parts[1].toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE',
                                endpoint: parts[2], fields,
                            };
                        }
                        break;
                    case 'form':
                        if (parts.length >= 2) {
                            const fields = parts[1].split(',').map(fieldStr => {
                                const [name, ftype, label, required, options] = fieldStr.split('|');
                                return {
                                    name: name.trim(),
                                    type: (ftype?.trim() as 'text' | 'email' | 'number' | 'select') || 'text',
                                    label: label?.trim() || name.trim(),
                                    required: required?.trim() === 'true',
                                    options: options?.split(';').map(o => o.trim()),
                                };
                            });
                            action = { type: 'form', label: parts[0], fields };
                        }
                        break;
                }

                if (action) actions.push({ original: fullMatch, action, id });
            } catch (error) {
                console.error('Error parsing action:', fullMatch, error);
            }
        }

        let processedContent = content;
        actions.forEach(({ original, id }) => {
            processedContent = processedContent.replace(original, `{{ACTION_${id}}}`);
        });
        return { processedContent, actions };
    }, [content, streaming]);

    // Render action segments from placeholder text
    const renderActionSegments = React.useCallback(
        (segments: Array<{ type: 'text' | 'action'; value: string }>) =>
            segments.map((seg, idx) => {
                if (seg.type === 'text') return <span key={idx}>{seg.value}</span>;
                const action = actions.find(a => a.id === seg.value);
                if (!action) return <span key={idx}>{`{{ACTION_${seg.value}}}`}</span>;
                return (
                    <ActionButton
                        key={idx}
                        action={action.action}
                        formOpen={openForms[seg.value] || false}
                        onFormOpenChange={(open) => setOpenForms(prev => ({ ...prev, [seg.value]: open }))}
                        onComplete={(result) => onActionComplete?.(action.action.type, result)}
                    />
                );
            }),
        [actions, openForms, onActionComplete]
    );

    // Custom components for react-markdown — only inject action placeholders when not streaming
    const components = React.useMemo(() => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        p: ({ children, ...props }: any) => {
            if (!streaming) {
                const segments = splitActionSegments(children);
                if (segments) {
                    return <div className="mb-2 last:mb-0">{renderActionSegments(segments)}</div>;
                }
            }
            return <p className="mb-2 last:mb-0" {...props}>{children}</p>;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        li: ({ children, ...props }: any) => {
            if (!streaming) {
                const segments = splitActionSegments(children);
                if (segments) {
                    return <li style={{ listStyle: 'none', marginBottom: '0.5rem' }}>{renderActionSegments(segments)}</li>;
                }
            }
            return <li {...props}>{children}</li>;
        },
        // Proper code block styling
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pre: ({ children, ...props }: any) => (
            <pre className="bg-muted/50 rounded-md p-3 overflow-x-auto text-xs my-2" {...props}>{children}</pre>
        ),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        code: ({ children, className, ...props }: any) => {
            const isBlock = className?.includes('language-');
            if (isBlock) {
                return <code className={`${className || ''} text-xs`} {...props}>{children}</code>;
            }
            return (
                <code className="bg-muted/70 px-1 py-0.5 rounded text-[0.85em] font-mono" {...props}>{children}</code>
            );
        },
        // Prevent external links from navigating away
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        a: ({ children, href, ...props }: any) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2" {...props}>{children}</a>
        ),
    }), [streaming, renderActionSegments]);

    // Guard against excessively large content
    const SAFE_MAX_MARKDOWN_CHARS = 100_000;
    if (processedContent.length > SAFE_MAX_MARKDOWN_CHARS) {
        return (
            <div className="whitespace-pre-wrap break-words text-sm">
                {processedContent}
            </div>
        );
    }

    return (
        <div className="prose prose-sm dark:prose-invert max-w-none break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <Markdown remarkPlugins={[remarkGfm]} components={components}>
                {processedContent}
            </Markdown>
        </div>
    );
}
