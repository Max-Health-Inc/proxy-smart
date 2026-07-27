// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { Checkbox, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@proxy-smart/shared-ui';
import { LoadingButton } from '@/components/ui/loading-button';
import { ArrowDownUp, Database, Plug, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FormData } from './types';

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CheckboxField({ label, description, checked, onChange }: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start space-x-3 cursor-pointer">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="mt-1"
      />
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
    </label>
  );
}

export function LdapForm({ form, setForm, onTestConnection, testing }: {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  onTestConnection: () => void;
  testing: boolean;
}) {
  const { t } = useTranslation();
  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      {/* Basic */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          {t('Basic Settings')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('Provider Name')} *</Label>
            <Input value={form.name} onChange={set('name')} placeholder="e.g. Corporate LDAP" />
          </div>
          <SelectField
            label={t('LDAP Vendor')}
            value={form.vendor}
            onChange={v => setForm(prev => ({ ...prev, vendor: v }))}
            options={[
              { value: 'ad', label: 'Active Directory' },
              { value: 'rhds', label: 'Red Hat Directory Server' },
              { value: 'tivoli', label: 'Tivoli' },
              { value: 'edirectory', label: 'Novell eDirectory' },
              { value: 'other', label: 'Other' },
            ]}
          />
        </div>
      </div>

      {/* Connection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Plug className="w-5 h-5 text-primary" />
          {t('Connection Settings')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-sm font-semibold">{t('Connection URL')} *</Label>
            <Input value={form.connectionUrl} onChange={set('connectionUrl')} placeholder="ldap://ldap.example.com:389" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('Bind DN')}</Label>
            <Input value={form.bindDn} onChange={set('bindDn')} placeholder="cn=admin,dc=example,dc=com" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('Bind Credential')}</Label>
            <Input type="password" value={form.bindCredential} onChange={set('bindCredential')} placeholder="••••••••" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <CheckboxField
            label={t('Enable StartTLS')}
            checked={form.startTls}
            onChange={v => setForm(prev => ({ ...prev, startTls: v }))}
          />
          <CheckboxField
            label={t('Connection Pooling')}
            checked={form.connectionPooling}
            onChange={v => setForm(prev => ({ ...prev, connectionPooling: v }))}
          />
        </div>
        <LoadingButton
          type="button"
          variant="outline"
          onClick={onTestConnection}
          loading={testing}
          disabled={!form.connectionUrl}
          className="rounded-xl"
        >
          <Plug className="w-4 h-4 mr-2" />
          {t('Test Connection')}
        </LoadingButton>
      </div>

      {/* Users DN & attributes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {t('LDAP Users')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-sm font-semibold">{t('Users DN')} *</Label>
            <Input value={form.usersDn} onChange={set('usersDn')} placeholder="ou=users,dc=example,dc=com" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('Username LDAP Attribute')}</Label>
            <Input value={form.usernameLDAPAttribute} onChange={set('usernameLDAPAttribute')} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('RDN LDAP Attribute')}</Label>
            <Input value={form.rdnLDAPAttribute} onChange={set('rdnLDAPAttribute')} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('UUID LDAP Attribute')}</Label>
            <Input value={form.uuidLDAPAttribute} onChange={set('uuidLDAPAttribute')} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('User Object Classes')}</Label>
            <Input value={form.userObjectClasses} onChange={set('userObjectClasses')} />
          </div>
        </div>
      </div>

      {/* Sync & Edit Mode */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ArrowDownUp className="w-5 h-5 text-primary" />
          {t('Sync Settings')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            label={t('Edit Mode')}
            value={form.editMode}
            onChange={v => setForm(prev => ({ ...prev, editMode: v }))}
            options={[
              { value: 'READ_ONLY', label: 'Read Only' },
              { value: 'WRITABLE', label: 'Writable' },
              { value: 'UNSYNCED', label: 'Unsynced' },
            ]}
          />
          <SelectField
            label={t('Search Scope')}
            value={form.searchScope}
            onChange={v => setForm(prev => ({ ...prev, searchScope: v }))}
            options={[
              { value: '1', label: 'One Level' },
              { value: '2', label: 'Subtree' },
            ]}
          />
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('Batch Size')}</Label>
            <Input value={form.batchSizeForSync} onChange={set('batchSizeForSync')} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('Full Sync Period (seconds)')}</Label>
            <Input value={form.fullSyncPeriod} onChange={set('fullSyncPeriod')} placeholder="-1 to disable" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('Changed Users Sync Period (seconds)')}</Label>
            <Input value={form.changedSyncPeriod} onChange={set('changedSyncPeriod')} placeholder="-1 to disable" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CheckboxField
            label={t('Import Users')}
            description={t('Import users from LDAP into Keycloak database')}
            checked={form.importEnabled}
            onChange={v => setForm(prev => ({ ...prev, importEnabled: v }))}
          />
          <CheckboxField
            label={t('Sync Registrations')}
            description={t('Sync new Keycloak registrations to LDAP')}
            checked={form.syncRegistrations}
            onChange={v => setForm(prev => ({ ...prev, syncRegistrations: v }))}
          />
          <CheckboxField
            label={t('Pagination')}
            description={t('Use paged result controls for LDAP queries')}
            checked={form.pagination}
            onChange={v => setForm(prev => ({ ...prev, pagination: v }))}
          />
          <CheckboxField
            label={t('Trust Email')}
            description={t('Trust email addresses from LDAP without verification')}
            checked={form.trustEmail}
            onChange={v => setForm(prev => ({ ...prev, trustEmail: v }))}
          />
        </div>
      </div>
    </div>
  );
}
