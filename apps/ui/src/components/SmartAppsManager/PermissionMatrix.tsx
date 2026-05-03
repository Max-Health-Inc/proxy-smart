import React, { useMemo, useState } from 'react';
import { Button, Input } from '@max-health-inc/shared-ui';
import { useTranslation } from 'react-i18next';

/**
 * PermissionMatrix
 * Simple scope management UI for SMART scopes used by an app registration.
 * Stores a string[] of scopes; backend should translate to policies.
 */

type Props = {
  appId?: string;
  initialScopes?: string[];
  onSave?: (scopes: string[]) => void;
};

const DEFAULT_SCOPES = [
  'openid',
  'profile',
  'offline_access',
  'launch',
  'patient/*.read',
];

const SUGGESTED_RESOURCES = [
  'All',
  'AllergyIntolerance',
  'Condition',
  'DiagnosticReport',
  'Encounter',
  'Immunization',
  'MedicationRequest',
  'Observation',
  'Patient',
  'Procedure',
];

function normalizeScope(s: string) {
  return s.trim().replace(/\s+/g, ' ');
}

function isValidScope(scope: string) {
  // Minimal SMART scope syntax validation
  // Examples: patient/Observation.read, user/*.write, launch/patient
  if (!scope) return false;
  if (['openid', 'profile', 'offline_access', 'launch'].includes(scope)) return true;
  const re = /^(patient|user|system)\/(\*|[A-Za-z]+)\.(read|write|\*|read\+write)$/;
  return re.test(scope);
}

export const PermissionMatrix: React.FC<Props> = ({ appId, initialScopes = [], onSave }) => {
  const { t } = useTranslation();
  const [scopes, setScopes] = useState<string[]>(() =>
    initialScopes.length ? Array.from(new Set(initialScopes.map(normalizeScope))) : DEFAULT_SCOPES
  );
  const [customScope, setCustomScope] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const invalidScopes = useMemo(() => scopes.filter((s) => !isValidScope(s)), [scopes]);

  const addCustomScope = () => {
    const s = normalizeScope(customScope);
    if (!s) return;
    if (!isValidScope(s)) {
      setStatus(`Invalid scope syntax: ${s}`);
      return;
    }
    setScopes((prev) => Array.from(new Set([...prev, s])));
    setCustomScope('');
    setStatus(null);
  };

  const addSuggested = (prefix: 'patient' | 'user' | 'system', resource: string, access: 'read' | 'write' | 'read+write') => {
    const res = resource === 'All' ? '*' : resource;
    const scope = `${prefix}/${res}.${access}`;
    setScopes((prev) => Array.from(new Set([...prev, scope])));
  };

  const removeScope = (scopeToRemove: string) => setScopes((s) => s.filter((x) => x !== scopeToRemove));

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const uniqueScopes = Array.from(new Set(scopes.map(normalizeScope)));
      if (appId) {
        const resp = await fetch(`/api/apps/${encodeURIComponent(appId)}/permissions`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scopes: uniqueScopes }),
        });
        if (!resp.ok) throw new Error(`Save failed: ${resp.status}`);
      }
      setStatus('Saved');
      onSave?.(Array.from(new Set(scopes)));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus(message);
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  return (
    <div className="border border-border rounded-lg p-4 max-w-[1000px]">
      <h3 className="text-lg font-semibold text-foreground mb-3">{t('Permission Matrix')}</h3>

      <div className="grid gap-3 mb-4">
        <div>
          <strong className="text-foreground">{t('Current Scopes')}</strong>
          <div className="flex gap-2 flex-wrap mt-2">
            {scopes.map((s) => (
              <div key={s} className="bg-muted px-2 py-1.5 rounded-md flex items-center gap-2">
                <span className="font-mono text-sm">{s}</span>
                <Button variant="ghost" size="sm" className="h-auto p-0 text-muted-foreground hover:text-destructive" onClick={() => removeScope(s)} aria-label={`Remove ${s}`}>
                  ×
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <strong className="text-foreground">{t('Add Scope')}</strong>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Input
              value={customScope}
              onChange={(e) => setCustomScope(e.target.value)}
              placeholder="e.g. patient/Observation.read"
              className="flex-1 min-w-[260px]"
            />
            <Button onClick={addCustomScope}>{t('Add')}</Button>
          </div>
          {status && <div className={`mt-1.5 text-sm ${status.startsWith('Invalid') ? 'text-destructive' : 'text-foreground'}`}>{status}</div>}
        </div>

        <details>
          <summary className="cursor-pointer text-sm font-medium text-foreground">{t('Quick Add')}</summary>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {(['patient', 'user'] as const).map((who) => (
              <div key={who} className="border border-border p-2 rounded">
                <div className="font-semibold mb-1.5 text-foreground">{who}</div>
                <div className="flex gap-1.5 flex-wrap">
                  {SUGGESTED_RESOURCES.map((res) => (
                    <div key={`${who}-${res}`} className="flex items-center gap-1">
                      <span className="font-mono text-sm">{res}</span>
                      <Button variant="ghost" size="sm" className="h-auto px-1 py-0.5 text-xs" onClick={() => addSuggested(who, res, 'read')}>.read</Button>
                      <Button variant="ghost" size="sm" className="h-auto px-1 py-0.5 text-xs" onClick={() => addSuggested(who, res, 'write')}>.write</Button>
                      <Button variant="ghost" size="sm" className="h-auto px-1 py-0.5 text-xs" onClick={() => addSuggested(who, res, 'read+write')}>.read+write</Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving || invalidScopes.length > 0}>
          {saving ? 'Saving...' : 'Save Permissions'}
        </Button>
        {invalidScopes.length > 0 && (
          <span className="text-destructive text-sm">Invalid scopes: {invalidScopes.join(', ')}</span>
        )}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-foreground">{t('Help')}</summary>
        <div className="p-2 text-sm text-muted-foreground">
          <p>{t('Use SMART scopes like patient/Observation.read, user/*.write, offline_access. The backend should enforce policies.')}</p>
          <p className="mt-1">{t('For refresh tokens include offline_access. For patient context, prefer patient/Resource.access scopes.')}</p>
        </div>
      </details>
    </div>
  );
};

export default PermissionMatrix;