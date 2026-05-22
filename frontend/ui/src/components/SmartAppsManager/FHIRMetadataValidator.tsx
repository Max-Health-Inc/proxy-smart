import React, { useState } from 'react';
import { Button, Input } from '@proxy-smart/shared-ui';
import { useTranslation } from 'react-i18next';

/**
 * FHIRMetadataValidator
 * Fetches /metadata and optionally .well-known/smart-configuration, runs SMART/OAuth checks.
 */

type Check = { id: string; ok: boolean; message: string };

type FHIRExtension = {
  url?: string;
  valueUri?: string;
  valueUrl?: string;
  extension?: FHIRExtension[];
};

type FHIRSecurityComponent = {
  extension?: FHIRExtension[];
};

type FHIRRestComponent = {
  mode?: string;
  security?: FHIRSecurityComponent;
};

type CapabilityStatement = {
  resourceType?: string;
  rest?: FHIRRestComponent[];
};

type SMARTConfiguration = {
  authorization_endpoint?: string;
  token_endpoint?: string;
  grant_types_supported?: string[];
};

type ValidationResult = {
  ok: boolean;
  checks: Check[];
  raw?: CapabilityStatement;
  smartConfig?: SMARTConfiguration;
};

async function fetchJson(url: string) {
  const resp = await fetch(url, { headers: { Accept: 'application/fhir+json, application/json' } });
  if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
  return resp.json();
}

export const FHIRMetadataValidator: React.FC = () => {
  const { t } = useTranslation();
  const [base, setBase] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    setResult(null);
    if (!base) return setError('FHIR base URL required');
    setLoading(true);
    try {
      const baseUrl = base.replace(/\/$/, '');
      const metaUrl = baseUrl + '/metadata';
      const json = await fetchJson(metaUrl);

      const checks: Check[] = [];
      checks.push({ id: 'resourceType', ok: json.resourceType === 'CapabilityStatement', message: `resourceType=${json.resourceType}` });

      const rest = Array.isArray(json.rest) ? json.rest : [];
      const restServer = rest.find((r: FHIRRestComponent) => r.mode === 'server') || rest[0];
      const security = restServer?.security;
      checks.push({ id: 'security', ok: !!security, message: security ? 'security present' : 'security missing' });

      // SMART OAuth URIs extension per spec https://www.hl7.org/fhir/smart-app-launch/conformance.html
      let oauthUrisExt: FHIRExtension | undefined;
      if (security?.extension) {
        oauthUrisExt = security.extension.find((ext: FHIRExtension) =>
          typeof ext?.url === 'string' && /smart-configuration|oauth-uris/i.test(ext.url)
        );
      }
      checks.push({ id: 'oauth-uris-ext', ok: !!oauthUrisExt, message: oauthUrisExt ? `extension url=${oauthUrisExt.url}` : 'oauth-uris extension not found' });

      const endpoints: Record<string, string> = {};
      if (oauthUrisExt?.extension && Array.isArray(oauthUrisExt.extension)) {
        for (const sub of oauthUrisExt.extension) {
          if (sub.url && (sub.valueUri || sub.valueUrl)) {
            endpoints[sub.url] = (sub.valueUri || sub.valueUrl) as string;
          }
        }
      }

      const hasAuthorize = !!Object.keys(endpoints).find((k) => /authorize/i.test(k));
      const hasToken = !!Object.keys(endpoints).find((k) => /token/i.test(k));
      checks.push({ id: 'authorize-endpoint', ok: hasAuthorize, message: hasAuthorize ? `found (${Object.keys(endpoints).filter((k) => /authorize/i.test(k)).map((k) => endpoints[k]).join(', ')})` : 'authorize endpoint missing' });
      checks.push({ id: 'token-endpoint', ok: hasToken, message: hasToken ? `found (${Object.keys(endpoints).filter((k) => /token/i.test(k)).map((k) => endpoints[k]).join(', ')})` : 'token endpoint missing' });

      // Try .well-known/smart-configuration if same origin; may fail due to CORS
      let smartConfig: SMARTConfiguration | undefined;
      try {
        const smartWellKnown = baseUrl + '/.well-known/smart-configuration';
        smartConfig = await fetchJson(smartWellKnown);
        checks.push({ id: 'smart-well-known', ok: true, message: 'smart-configuration fetched' });
        if (smartConfig?.authorization_endpoint) {
          checks.push({ id: 'smart-authorize', ok: true, message: `authorization_endpoint=${smartConfig.authorization_endpoint}` });
        }
        if (smartConfig?.token_endpoint) {
          checks.push({ id: 'smart-token', ok: true, message: `token_endpoint=${smartConfig.token_endpoint}` });
        }
        if (smartConfig && Array.isArray(smartConfig.grant_types_supported)) {
          const supportsAuthCode = smartConfig.grant_types_supported.includes('authorization_code');
          checks.push({ id: 'grant-types', ok: supportsAuthCode, message: supportsAuthCode ? 'authorization_code supported' : 'authorization_code not listed' });
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'fetch failed';
        checks.push({ id: 'smart-well-known', ok: false, message: `smart-configuration not available (${message})` });
      }

      const ok = checks.every((c) => c.ok);
      setResult({ ok, checks, raw: json, smartConfig });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-border rounded-lg p-4 max-w-[1000px]">
      <h3 className="text-lg font-semibold text-foreground mb-3">{t('FHIR Metadata Validator')}</h3>
      <div className="flex gap-2 mb-3">
        <Input value={base} onChange={(e) => setBase(e.target.value)} placeholder="https://fhirserver.example" className="flex-[0.7]" />
        <Button onClick={run} disabled={loading}>
          {loading ? 'Checking...' : 'Fetch /metadata'}
        </Button>
      </div>
      {error && <div role="alert" className="text-destructive text-sm mb-2">{error}</div>}
      {result && (
        <div className="mt-3">
          <div className="font-bold text-foreground">Summary: {result.ok ? 'Looks good' : 'Issues found'}</div>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            {result.checks.map((c) => (
              <li key={c.id} className={c.ok ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
                {c.id}: {c.message}
              </li>
            ))}
          </ul>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">{t('Raw capability statement')}</summary>
            <pre className="max-h-[400px] overflow-auto text-xs bg-muted p-3 rounded-md mt-1">{JSON.stringify(result.raw, null, 2)}</pre>
          </details>
          {result.smartConfig && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground">{t('SMART configuration')}</summary>
              <pre className="max-h-[400px] overflow-auto text-xs bg-muted p-3 rounded-md mt-1">{JSON.stringify(result.smartConfig, null, 2)}</pre>
            </details>
          )}
        </div>
      )}

      <div className="mt-3 text-sm text-muted-foreground">
        {t('Tip: If fetching fails in browser, the server may not allow CORS for your origin. Try a proxy or server-side check.')}
      </div>
    </div>
  );
};

export default FHIRMetadataValidator;