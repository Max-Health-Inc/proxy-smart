import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/stores/authStore';
import { CheckCircle, AlertCircle, Shield, Wrench, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@max-health-inc/shared-ui';
import { Badge } from '@max-health-inc/shared-ui';
import type { ScopeMapperInfo } from '@/lib/api-client';

interface ProtocolMappersManagerProps {
  embedded?: boolean;
}

export function ProtocolMappersManager({ embedded }: ProtocolMappersManagerProps) {
  const { t } = useTranslation();
  const { clientApis } = useAuth();
  const [scopes, setScopes] = useState<ScopeMapperInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fixResult, setFixResult] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!clientApis) return;
    try {
      setError(null);
      setLoading(true);
      const result = await clientApis.admin.getAdminScopeMappers();
      setScopes(result.status);
    } catch {
      setError(t('Failed to load scope mapper status'));
    } finally {
      setLoading(false);
    }
  }, [clientApis, t]);

  useEffect(() => {
    if (!clientApis) return;
    clientApis.admin.getAdminScopeMappers()
      .then(result => {
        setScopes(result.status);
        setError(null);
      })
      .catch(() => setError(t('Failed to load scope mapper status')))
      .finally(() => setLoading(false));
  }, [clientApis, t]);

  const handleFixAll = async () => {
    if (!clientApis) return;
    try {
      setFixing(true);
      setFixResult(null);
      setError(null);
      const result = await clientApis.admin.postAdminScopeMappersFix();
      setFixResult(result.message);
      await fetchStatus();
    } catch {
      setError(t('Failed to fix mappers'));
    } finally {
      setFixing(false);
    }
  };

  const handleDeleteMapper = async (scopeId: string, mapperId: string) => {
    if (!clientApis || !mapperId) return;
    try {
      setError(null);
      await clientApis.admin.deleteAdminScopeMappersByScopeIdByMapperId({ scopeId, mapperId });
      await fetchStatus();
    } catch {
      setError(t('Failed to delete mapper'));
    }
  };

  const allHealthy = scopes.length > 0 && scopes.every(s => s.healthy);
  const unhealthyCount = scopes.filter(s => !s.healthy).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={embedded ? 'space-y-4' : 'p-4 sm:p-6 space-y-6'}>
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {allHealthy ? (
            <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              {t('All mappers healthy')}
            </Badge>
          ) : (
            <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20">
              <AlertCircle className="w-3.5 h-3.5 mr-1" />
              {t('{{count}} scope(s) with missing mappers', { count: unhealthyCount })}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            {t('Refresh')}
          </Button>
          {!allHealthy && (
            <LoadingButton size="sm" onClick={handleFixAll} loading={fixing}>
              <Wrench className="w-3.5 h-3.5 mr-1" />
              {t('Fix All')}
            </LoadingButton>
          )}
        </div>
      </div>

      {/* Result / Error messages */}
      {fixResult && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-sm text-green-700 dark:text-green-400">
          {fixResult}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Scope mapper table */}
      {scopes.length === 0 ? (
        <EmptyState icon={Shield} title={t('No SMART scopes found in Keycloak')} className="py-8" />
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border/50">
                <th className="text-left p-3 font-medium">{t('Scope')}</th>
                <th className="text-left p-3 font-medium">{t('Mapper')}</th>
                <th className="text-left p-3 font-medium">{t('Claim')}</th>
                <th className="text-center p-3 font-medium">{t('Access')}</th>
                <th className="text-center p-3 font-medium">{t('ID')}</th>
                <th className="text-center p-3 font-medium">{t('Userinfo')}</th>
                <th className="text-center p-3 font-medium">{t('Status')}</th>
                <th className="text-right p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {scopes.map((scope) => (
                <>
                  {/* Existing mappers */}
                  {scope.mappers.map((mapper, idx) => (
                    <tr key={`${scope.scopeId}-${mapper.id ?? idx}`} className="border-b border-border/30 hover:bg-muted/30">
                      {idx === 0 && (
                        <td className="p-3 font-mono text-xs" rowSpan={scope.mappers.length + scope.missingMappers.length || 1}>
                          <div className="flex items-center gap-2">
                            {scope.healthy ? (
                              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                            )}
                            {scope.scopeName}
                          </div>
                        </td>
                      )}
                      <td className="p-3 font-mono text-xs">{mapper.name}</td>
                      <td className="p-3 font-mono text-xs">{mapper.claimName}</td>
                      <td className="p-3 text-center">{mapper.accessTokenClaim ? '✓' : '—'}</td>
                      <td className="p-3 text-center">{mapper.idTokenClaim ? '✓' : '—'}</td>
                      <td className="p-3 text-center">{mapper.userinfoTokenClaim ? '✓' : '—'}</td>
                      <td className="p-3 text-center">
                        <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                          {t('OK')}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {mapper.id && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteMapper(scope.scopeId, mapper.id!)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Missing mappers */}
                  {scope.missingMappers.map((name) => (
                    <tr key={`${scope.scopeId}-missing-${name}`} className="border-b border-border/30 bg-red-500/5">
                      {scope.mappers.length === 0 && (
                        <td className="p-3 font-mono text-xs" rowSpan={scope.missingMappers.length}>
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                            {scope.scopeName}
                          </div>
                        </td>
                      )}
                      <td className="p-3 font-mono text-xs text-muted-foreground">{name}</td>
                      <td className="p-3 text-muted-foreground" colSpan={4}>—</td>
                      <td className="p-3 text-center">
                        <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">
                          {t('Missing')}
                        </Badge>
                      </td>
                      <td className="p-3"></td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
