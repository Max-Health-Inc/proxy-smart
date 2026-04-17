import { Button, Input, Label } from '@proxy-smart/shared-ui';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface OrgFormData {
  name: string;
  alias: string;
  description: string;
  enabled: boolean;
  domains: string[];
  redirectUrl: string;
}

export const createEmptyOrgForm = (): OrgFormData => ({
  name: '',
  alias: '',
  description: '',
  enabled: true,
  domains: [],
  redirectUrl: '',
});

interface OrgAddFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OrgFormData) => Promise<void>;
}

export function OrgAddForm({ isOpen, onClose, onSubmit }: OrgAddFormProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<OrgFormData>(createEmptyOrgForm());
  const [domainInput, setDomainInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
      setForm(createEmptyOrgForm());
      setDomainInput('');
    } finally {
      setSubmitting(false);
    }
  };

  const addDomain = () => {
    const d = domainInput.trim().toLowerCase();
    if (d && !form.domains.includes(d)) {
      setForm((prev) => ({ ...prev, domains: [...prev.domains, d] }));
      setDomainInput('');
    }
  };

  const removeDomain = (domain: string) => {
    setForm((prev) => ({ ...prev, domains: prev.domains.filter((d) => d !== domain) }));
  };

  return (
    <div className="bg-card/70 backdrop-blur-sm p-8 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Add New Organization')}</h3>
            <p className="text-muted-foreground font-medium">{t('Create a new Keycloak organization')}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="org-name" className="text-sm font-semibold text-foreground">{t('Name')}</Label>
            <Input
              id="org-name"
              placeholder="e.g., Acme Health System"
              value={form.name}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  name: value,
                  alias: prev.alias || value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                }));
              }}
              className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
              required
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="org-alias" className="text-sm font-semibold text-foreground">{t('Alias (immutable)')}</Label>
            <Input
              id="org-alias"
              placeholder="e.g., acme-health"
              value={form.alias}
              onChange={(e) => setForm((prev) => ({ ...prev, alias: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
              className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
              required
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="org-description" className="text-sm font-semibold text-foreground">{t('Description')}</Label>
          <Textarea
            id="org-description"
            placeholder={t('Optional description...')}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
            rows={3}
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="org-redirect" className="text-sm font-semibold text-foreground">{t('Redirect URL')}</Label>
          <Input
            id="org-redirect"
            type="url"
            placeholder="https://example.com/callback"
            value={form.redirectUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, redirectUrl: e.target.value }))}
            className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold text-foreground">{t('Email Domains')}</Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., acme.com"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDomain(); } }}
              className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm flex-1"
            />
            <Button type="button" variant="outline" onClick={addDomain}>{t('Add')}</Button>
          </div>
          {form.domains.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {form.domains.map((d) => (
                <span key={d} className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-muted text-sm">
                  {d}
                  <button type="button" onClick={() => removeDomain(d)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="org-enabled"
            checked={form.enabled}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, enabled: !!checked }))}
          />
          <Label htmlFor="org-enabled" className="text-sm font-medium">{t('Enabled')}</Label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" disabled={submitting || !form.name.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            {submitting ? t('Creating...') : t('Create Organization')}
          </Button>
        </div>
      </form>
    </div>
  );
}
