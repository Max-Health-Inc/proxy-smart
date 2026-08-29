import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@proxy-smart/shared-ui';
import { Landmark } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Organization } from '@/lib/types/api';

/** Sentinel for "no organization"; Select cannot carry an empty string value. */
const NONE = '__none__';

interface OrganizationLinkFieldProps {
  organizations: Organization[];
  value: string | undefined;
  onChange: (organizationId: string | undefined) => void;
}

/**
 * The organization link picker shared by the IdP add form and edit dialog.
 *
 * Renders nothing when the realm has no organizations, which is how both callers
 * already gated it.
 */
export function OrganizationLinkField({ organizations, value, onChange }: OrganizationLinkFieldProps) {
  const { t } = useTranslation();
  if (organizations.length === 0) return null;

  return (
    <div className="bg-card/70 p-6 rounded-xl border border-border/50">
      <h4 className="text-lg font-semibold text-foreground mb-2 flex items-center space-x-2">
        <Landmark className="w-5 h-5" />
        <span>{t('Organization')}</span>
      </h4>
      <p className="text-sm text-muted-foreground mb-4">
        {t('Link this identity provider to an organization. Users authenticating through this IdP will be associated with the selected organization.')}
      </p>
      <Select
        value={value ?? NONE}
        onValueChange={next => onChange(next === NONE ? undefined : next)}
      >
        <SelectTrigger>
          <SelectValue placeholder={t('No organization linked')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{t('No organization linked')}</SelectItem>
          {organizations.map(org => (
            <SelectItem key={org.id!} value={org.id!}>
              {org.name} {org.alias ? `(${org.alias})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
