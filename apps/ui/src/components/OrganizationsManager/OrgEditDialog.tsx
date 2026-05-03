import { Button, Input, Label, Tabs, TabsContent, TabsList, TabsTrigger } from '@max-health-inc/shared-ui';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Edit, X, Palette, Settings } from 'lucide-react';
import { useState } from 'react';
import type { Organization } from '@/lib/api-client';
import { useTranslation } from 'react-i18next';
import { OrgBrandingTab } from './OrgBrandingTab';

interface OrgEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (orgId: string, data: {
    name?: string;
    description?: string;
    enabled?: boolean;
    redirectUrl?: string;
    domains?: Array<{ name: string; verified?: boolean }>;
  }) => Promise<void>;
  org: Organization | null;
}

export function OrgEditDialog({ isOpen, onClose, onUpdate, org }: OrgEditDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(org?.name ?? '');
  const [description, setDescription] = useState(org?.description ?? '');
  const [enabled, setEnabled] = useState(org?.enabled !== false);
  const [redirectUrl, setRedirectUrl] = useState(org?.redirectUrl ?? '');
  const [domains, setDomains] = useState<Array<{ name: string; verified?: boolean }>>(
    (org?.domains ?? []).map((d) => ({ name: d.name ?? '', verified: d.verified }))
  );
  const [domainInput, setDomainInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!org) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org.id) return;
    setSubmitting(true);
    try {
      await onUpdate(org.id, { name, description, enabled, redirectUrl, domains });
    } finally {
      setSubmitting(false);
    }
  };

  const addDomain = () => {
    const d = domainInput.trim().toLowerCase();
    if (d && !domains.some((x) => x.name === d)) {
      setDomains((prev) => [...prev, { name: d }]);
      setDomainInput('');
    }
  };

  const removeDomain = (domainName: string) => {
    setDomains((prev) => prev.filter((d) => d.name !== domainName));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <Edit className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">
                {t('Edit Organization')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium mt-1">
                {t('Modify')} {org.name} ({org.alias})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="general" className="gap-2">
              <Settings className="w-4 h-4" /> {t('General')}
            </TabsTrigger>
            <TabsTrigger value="branding" className="gap-2">
              <Palette className="w-4 h-4" /> {t('Branding')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="edit-org-name" className="text-sm font-semibold">{t('Name')}</Label>
            <Input
              id="edit-org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border-border/50"
              required
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-muted-foreground">{t('Alias')}</Label>
            <Input value={org.alias ?? ''} disabled className="rounded-xl border-border/50 opacity-60" />
            <p className="text-xs text-muted-foreground">{t('Alias cannot be changed after creation')}</p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="edit-org-desc" className="text-sm font-semibold">{t('Description')}</Label>
            <Textarea
              id="edit-org-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl border-border/50"
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="edit-org-redirect" className="text-sm font-semibold">{t('Redirect URL')}</Label>
            <Input
              id="edit-org-redirect"
              type="url"
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
              className="rounded-xl border-border/50"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t('Email Domains')}</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., acme.com"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDomain(); } }}
                className="rounded-xl border-border/50 flex-1"
              />
              <Button type="button" variant="outline" onClick={addDomain}>{t('Add')}</Button>
            </div>
            {domains.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {domains.map((d) => (
                  <span key={d.name} className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-muted text-sm">
                    {d.name}
                    {d.verified && <span className="text-green-500 text-xs">✓</span>}
                    <button type="button" onClick={() => removeDomain(d.name)} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-org-enabled"
              checked={enabled}
              onCheckedChange={(checked) => setEnabled(!!checked)}
            />
            <Label htmlFor="edit-org-enabled" className="text-sm font-medium">{t('Enabled')}</Label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? t('Saving...') : t('Save Changes')}
            </Button>
          </div>
        </form>
          </TabsContent>

          <TabsContent value="branding">
            <OrgBrandingTab orgId={org.id!} orgName={org.name ?? ''} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
