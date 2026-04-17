import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, AppWindow } from 'lucide-react';
import { Badge, Button } from '@proxy-smart/shared-ui';
import { LoadingButton } from '@/components/ui/loading-button';
import { Checkbox } from './ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import type { SmartApp } from '../lib/api-client';

// ─── Types ───────────────────────────────────────────────────────────

type AssignmentField = 'allowedMcpServerNames' | 'allowedSkillNames';

interface AssignAppsDialogProps {
    /** Currently visible? */
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The name of the resource being assigned (MCP server name or skill name) */
    resourceName: string;
    /** Label for the resource type shown in the dialog description */
    resourceLabel: string;
    /** Which SmartApp field stores the assignment list */
    field: AssignmentField;
    /** All SMART apps */
    smartApps: SmartApp[];
    /** API call to update a single app */
    updateApp: (clientId: string, update: Partial<SmartApp>) => Promise<void>;
    /** Callback after saving */
    onSaved: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getAssignedNames(app: SmartApp, field: AssignmentField): string[] {
    return (app[field] as string[] | undefined) ?? [];
}

function isGlobalAccess(app: SmartApp, field: AssignmentField): boolean {
    if (field === 'allowedMcpServerNames') return app.mcpAccessType === 'all-mcp-servers';
    return false; // skills have no "all" mode
}

// ─── Inline "Assigned SMART Apps" display ────────────────────────────

interface AssignedAppsBadgesProps {
    resourceName: string;
    field: AssignmentField;
    smartApps: SmartApp[];
    onManage: () => void;
    emptyMessage?: string;
}

export function AssignedAppsBadges({
    resourceName,
    field,
    smartApps,
    onManage,
    emptyMessage,
}: AssignedAppsBadgesProps) {
    const { t } = useTranslation();

    const appsUsing = smartApps.filter(app => {
        if (isGlobalAccess(app, field)) return true;
        return getAssignedNames(app, field).includes(resourceName);
    });

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center">
                    <AppWindow className="w-4 h-4 mr-2 text-blue-500" />
                    {t('Assigned SMART Apps')}
                </h4>
                <Button variant="outline" size="sm" onClick={onManage} className="h-7 text-xs">
                    <Link2 className="w-3 h-3 mr-1" />
                    {t('Manage')}
                </Button>
            </div>
            {appsUsing.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                    {emptyMessage ?? t('No SMART apps are using this resource yet.')}
                </p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {appsUsing.map(app => (
                        <Badge key={app.clientId} variant="secondary" className="text-xs">
                            {isGlobalAccess(app, field) && (
                                <span className="mr-1 text-green-500">★</span>
                            )}
                            {app.name || app.clientId}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Dialog ──────────────────────────────────────────────────────────

export function AssignAppsDialog({
    open,
    onOpenChange,
    resourceName,
    resourceLabel,
    field,
    smartApps,
    updateApp,
    onSaved,
}: AssignAppsDialogProps) {
    const { t } = useTranslation();
    const [assignments, setAssignments] = useState<Record<string, boolean>>({});
    const [saving, setSaving] = useState(false);

    // Initialize checkbox state when opening
    const handleOpenChange = useCallback((isOpen: boolean) => {
        if (isOpen) {
            const init: Record<string, boolean> = {};
            smartApps.forEach(app => {
                if (app.clientId) {
                    init[app.clientId] = isGlobalAccess(app, field) ||
                        getAssignedNames(app, field).includes(resourceName);
                }
            });
            setAssignments(init);
        }
        onOpenChange(isOpen);
    }, [smartApps, field, resourceName, onOpenChange]);

    const handleSave = async () => {
        setSaving(true);
        try {
            for (const app of smartApps) {
                if (!app.clientId) continue;
                if (isGlobalAccess(app, field)) continue; // can't toggle global access

                const shouldHave = assignments[app.clientId] || false;
                const currentlyHas = getAssignedNames(app, field).includes(resourceName);
                if (shouldHave === currentlyHas) continue;

                let newList = [...getAssignedNames(app, field)];
                if (shouldHave && !newList.includes(resourceName)) {
                    newList.push(resourceName);
                } else if (!shouldHave) {
                    newList = newList.filter(n => n !== resourceName);
                }

                // Build the update payload based on field
                if (field === 'allowedMcpServerNames') {
                    const currentType = app.mcpAccessType || 'none';
                    let finalType = currentType;
                    if (newList.length > 0 && currentType === 'none') finalType = 'selected-mcp-servers';
                    else if (newList.length === 0 && currentType === 'selected-mcp-servers') finalType = 'none';

                    await updateApp(app.clientId, {
                        mcpAccessType: finalType as 'none' | 'all-mcp-servers' | 'selected-mcp-servers',
                        allowedMcpServerNames: newList,
                    });
                } else {
                    await updateApp(app.clientId, { allowedSkillNames: newList });
                }
            }

            onSaved();
            onOpenChange(false);
        } catch (err) {
            console.error('Failed to save assignments:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Link2 className="h-5 w-5" />
                        {t('Assign to SMART Apps')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('Select which SMART apps can use the {{label}} "{{name}}"', {
                            label: resourceLabel,
                            name: resourceName,
                        })}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
                    {smartApps.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            {t('No SMART apps found. Create a SMART app first.')}
                        </p>
                    ) : (
                        smartApps.map(app => {
                            const global = isGlobalAccess(app, field);
                            return (
                                <div key={app.clientId} className="flex items-start space-x-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30">
                                    <Checkbox
                                        id={`assign-${field}-${app.clientId}`}
                                        checked={assignments[app.clientId!] || false}
                                        onCheckedChange={(checked) => {
                                            if (global) return;
                                            setAssignments(prev => ({
                                                ...prev,
                                                [app.clientId!]: checked as boolean,
                                            }));
                                        }}
                                        disabled={global}
                                    />
                                    <div className="flex-1">
                                        <label
                                            htmlFor={`assign-${field}-${app.clientId}`}
                                            className={`text-sm font-medium cursor-pointer ${global ? 'text-muted-foreground' : 'text-foreground'}`}
                                        >
                                            {app.name || app.clientId}
                                        </label>
                                        {app.description && (
                                            <p className="text-xs text-muted-foreground mt-0.5">{app.description}</p>
                                        )}
                                        {global && (
                                            <Badge variant="outline" className="mt-1 text-xs text-green-600 border-green-500/30">
                                                {t('Has access to all MCP servers')}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                        {t('Cancel')}
                    </Button>
                    <LoadingButton onClick={handleSave} loading={saving} loadingText={t('Saving...')} disabled={smartApps.length === 0}>
                        {t('Save Assignments')}
                    </LoadingButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
