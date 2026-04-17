import { Button, Input, Label } from '@proxy-smart/shared-ui';
import { Badge } from '@proxy-smart/shared-ui';
import {
  AlertTriangle,
  BookOpen,
  Download,
  ExternalLink,
  Globe,
  Loader2,
  Search,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { AssignAppsDialog } from '../AssignAppsDialog';
import type { McpServer, RegistryServer, SkillsRegistryEntry, SmartApp } from './types';

/* ─── Server Dialogs ─────────────────────────────────────────────── */

interface AddServerDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  formData: { name: string; url: string; description: string };
  setFormData: React.Dispatch<React.SetStateAction<{ name: string; url: string; description: string }>>;
  formErrors: Record<string, string>;
  submitting: boolean;
  onSubmit: () => void;
}

export function AddServerDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  formErrors,
  submitting,
  onSubmit,
}: AddServerDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('Add MCP Server')}</DialogTitle>
          <DialogDescription>{t('Add a new external MCP server to the system.')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('Server Name')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="my-mcp-server"
              className={formErrors.name ? 'border-red-500' : ''}
            />
            {formErrors.name && <p className="text-sm text-red-600">{formErrors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">{t('Server URL')}</Label>
            <Input
              id="url"
              value={formData.url}
              onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
              placeholder="http://localhost:8082"
              className={formErrors.url ? 'border-red-500' : ''}
            />
            {formErrors.url && <p className="text-sm text-red-600">{formErrors.url}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">
              {t('Description')} ({t('optional')})
            </Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t('My custom MCP server')}
            />
          </div>
          {formErrors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{formErrors.submit}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('Cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={submitting} className="bg-green-600 hover:bg-green-700">
            {submitting ? t('Adding...') : t('Add Server')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Edit Server Dialog ─────────────────────────────────────────── */

interface EditServerDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedServer: McpServer | null;
  formData: { name: string; url: string; description: string };
  setFormData: React.Dispatch<React.SetStateAction<{ name: string; url: string; description: string }>>;
  formErrors: Record<string, string>;
  submitting: boolean;
  onSubmit: () => void;
}

export function EditServerDialog({
  open,
  onOpenChange,
  selectedServer,
  formData,
  setFormData,
  formErrors,
  submitting,
  onSubmit,
}: EditServerDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('Edit MCP Server')}</DialogTitle>
          <DialogDescription>
            {t('Update the configuration for')} {selectedServer?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('Server Name')}</Label>
            <Input value={formData.name} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">{t('Server name cannot be changed')}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-url">{t('Server URL')}</Label>
            <Input
              id="edit-url"
              value={formData.url}
              onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
              placeholder="http://localhost:8082"
              className={formErrors.url ? 'border-red-500' : ''}
            />
            {formErrors.url && <p className="text-sm text-red-600">{formErrors.url}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">
              {t('Description')} ({t('optional')})
            </Label>
            <Input
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t('My custom MCP server')}
            />
          </div>
          {formErrors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{formErrors.submit}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('Cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? t('Updating...') : t('Update Server')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Delete Server Dialog ───────────────────────────────────────── */

interface DeleteServerDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedServer: McpServer | null;
  formErrors: Record<string, string>;
  submitting: boolean;
  onSubmit: () => void;
}

export function DeleteServerDialog({
  open,
  onOpenChange,
  selectedServer,
  formErrors,
  submitting,
  onSubmit,
}: DeleteServerDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('Delete MCP Server')}</DialogTitle>
          <DialogDescription>
            {t('Are you sure you want to delete')} <strong>{selectedServer?.name}</strong>?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {t('This action cannot be undone. The server will be permanently removed from the system.')}
            </p>
          </div>
          {formErrors.submit && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{formErrors.submit}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('Cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={submitting} variant="destructive">
            {submitting ? t('Deleting...') : t('Delete Server')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Browse MCP Registry Dialog ─────────────────────────────────── */

interface BrowseRegistryDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  registrySearch: string;
  setRegistrySearch: (v: string) => void;
  registryResults: RegistryServer[];
  registryLoading: boolean;
  registryError: string | null;
  installingServer: string | null;
  onSearch: (query: string) => void;
  onInstall: (server: RegistryServer) => void;
}

export function BrowseRegistryDialog({
  open,
  onOpenChange,
  registrySearch,
  setRegistrySearch,
  registryResults,
  registryLoading,
  registryError,
  installingServer,
  onSearch,
  onInstall,
}: BrowseRegistryDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('MCP Server Registry')}
          </DialogTitle>
          <DialogDescription>
            {t('Browse the official MCP registry for servers with remote (streamable-http) transport.')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('Search servers...')}
              value={registrySearch}
              onChange={(e) => setRegistrySearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch(registrySearch);
              }}
              className="pl-9"
            />
          </div>
          <Button onClick={() => onSearch(registrySearch)} disabled={registryLoading}>
            {registryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Search')}
          </Button>
        </div>
        {registryError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{registryError}</p>
          </div>
        )}
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {registryLoading && registryResults.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : registryResults.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('No servers with remote transport found.')}</p>
            </div>
          ) : (
            registryResults.map((server) => (
              <div
                key={server.name}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{server.title || server.name}</h4>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        v{server.version}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {server.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="font-mono truncate">{server.name}</span>
                      {server.websiteUrl && (
                        <a
                          href={server.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {t('Website')}
                        </a>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onInstall(server)}
                    disabled={installingServer === server.name}
                    className="shrink-0"
                  >
                    {installingServer === server.name ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    {t('Add')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Assign Apps Dialog (wrapper) ───────────────────────────────── */

interface AssignAppsDialogWrapperProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  resourceName: string;
  resourceLabel: string;
  field: 'allowedMcpServerNames' | 'allowedSkillNames';
  smartApps: SmartApp[];
  updateApp: (clientId: string, update: Partial<SmartApp>) => Promise<void>;
  onSaved: () => void;
}

export function AssignAppsDialogWrapper({
  open,
  onOpenChange,
  resourceName,
  resourceLabel,
  field,
  smartApps,
  updateApp,
  onSaved,
}: AssignAppsDialogWrapperProps) {
  return (
    <AssignAppsDialog
      open={open}
      onOpenChange={onOpenChange}
      resourceName={resourceName}
      resourceLabel={resourceLabel}
      field={field}
      smartApps={smartApps}
      updateApp={updateApp}
      onSaved={onSaved}
    />
  );
}

/* ─── Add Skill Dialog ───────────────────────────────────────────── */

interface AddSkillDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  formData: { name: string; description: string; sourceUrl: string };
  setFormData: React.Dispatch<React.SetStateAction<{ name: string; description: string; sourceUrl: string }>>;
  formErrors: Record<string, string>;
  submitting: boolean;
  onSubmit: () => void;
}

export function AddSkillDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  formErrors,
  submitting,
  onSubmit,
}: AddSkillDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('Add Skill')}</DialogTitle>
          <DialogDescription>
            {t('Add an AI skill package that can be assigned to SMART apps.')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="skill-name">{t('Skill Name')}</Label>
            <Input
              id="skill-name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="health-skillz"
              className={formErrors.name ? 'border-red-500' : ''}
            />
            {formErrors.name && <p className="text-sm text-red-600">{formErrors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="skill-description">{t('Description')}</Label>
            <Input
              id="skill-description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t('Patient health record access via SMART on FHIR')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skill-source">{t('Source URL (optional)')}</Label>
            <Input
              id="skill-source"
              value={formData.sourceUrl}
              onChange={(e) => setFormData((prev) => ({ ...prev, sourceUrl: e.target.value }))}
              placeholder="https://github.com/jmandel/health-skillz"
            />
          </div>
          {formErrors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{formErrors.submit}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('Cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? t('Adding...') : t('Add Skill')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Browse Skills Registry (skills.sh) Dialog ──────────────────── */

interface SkillsRegistryDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  search: string;
  setSearch: (v: string) => void;
  results: SkillsRegistryEntry[];
  loading: boolean;
  error: string | null;
  installingSkillId: string | null;
  onSearch: (query: string) => void;
  onInstall: (skill: SkillsRegistryEntry) => void;
}

export function SkillsRegistryDialog({
  open,
  onOpenChange,
  search,
  setSearch,
  results,
  loading,
  error,
  installingSkillId,
  onSearch,
  onInstall,
}: SkillsRegistryDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('Skills Registry')}
          </DialogTitle>
          <DialogDescription>
            {t('Browse and install skills from the ')}
            <a
              href="https://skills.sh"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              skills.sh
            </a>
            {t(' public marketplace')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('Search skills... (e.g. agent, web, code)')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch(search);
              }}
              className="pl-9"
            />
          </div>
          <Button onClick={() => onSearch(search)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Search')}
          </Button>
        </div>
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {loading && results.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('No skills found. Try a different search term.')}</p>
            </div>
          ) : (
            results.map((skill) => (
              <div
                key={skill.id}
                className={`border rounded-lg p-4 transition-colors ${
                  skill.compatible !== false
                    ? 'hover:bg-muted/50'
                    : 'opacity-60 bg-muted/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{skill.name}</h4>
                      {skill.installs > 0 && (
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {skill.installs >= 1000
                            ? `${(skill.installs / 1000).toFixed(1)}K`
                            : skill.installs}{' '}
                          installs
                        </Badge>
                      )}
                      {skill.installed && (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                        >
                          Installed
                        </Badge>
                      )}
                      {skill.compatible === false && (
                        <Badge
                          variant="outline"
                          className="shrink-0 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {skill.incompatibleReason || 'Requires CLI'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {skill.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="font-mono truncate">
                        {skill.owner}/{skill.repo}
                      </span>
                      <a
                        href={skill.skillsshUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3" />
                        skills.sh
                      </a>
                      <a
                        href={skill.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3" />
                        GitHub
                      </a>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={
                      skill.installed || skill.compatible === false || installingSkillId === skill.id
                    }
                    onClick={() => onInstall(skill)}
                    title={
                      skill.compatible === false
                        ? skill.incompatibleReason || 'Incompatible — requires CLI access'
                        : undefined
                    }
                  >
                    {installingSkillId === skill.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : skill.installed ? (
                      <>{t('Installed')}</>
                    ) : skill.compatible === false ? (
                      <>{t('Incompatible')}</>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-1" />
                        {t('Install')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
