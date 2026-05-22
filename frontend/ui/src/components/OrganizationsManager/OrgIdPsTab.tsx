import { Badge } from '@proxy-smart/shared-ui';
import { useState, useEffect } from 'react';
import { Shield, ExternalLink } from 'lucide-react';
import { useAuth } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import type { IdentityProviderResponse } from '@/lib/api-client';

interface OrgIdPsTabProps {
  orgId: string;
  orgName: string;
}

export function OrgIdPsTab({ orgId, orgName }: OrgIdPsTabProps) {
  const { t } = useTranslation();
  const { isAuthenticated, clientApis } = useAuth();
  const [linkedIdPs, setLinkedIdPs] = useState<IdentityProviderResponse[]>([]);
  const canFetch = isAuthenticated && !!clientApis.identityProviders;
  const [loading, setLoading] = useState(canFetch);

  useEffect(() => {
    if (!canFetch) return;

    let cancelled = false;
    clientApis.identityProviders.getAdminIdps()
      .then((allIdps) => {
        if (!cancelled) {
          const linked = allIdps.filter((idp) => idp.organizationId === orgId);
          setLinkedIdPs(linked);
        }
      })
      .catch(() => { if (!cancelled) setLinkedIdPs([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [canFetch, clientApis.identityProviders, orgId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-1">
          {t('Linked Identity Providers')}
        </h4>
        <p className="text-sm text-muted-foreground">
          {t('Identity providers linked to {{orgName}}. Users authenticating through these IdPs will be associated with this organization.', { orgName })}
        </p>
      </div>

      {linkedIdPs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
          <Shield className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            {t('No identity providers are linked to this organization.')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('To link an IdP, edit it in the Identity Providers tab and select this organization.')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {linkedIdPs.map((idp) => (
            <div
              key={idp.alias}
              className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/70"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {idp.displayName ?? idp.alias}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {idp.providerId?.toUpperCase()} &middot; {idp.alias}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    idp.enabled !== false
                      ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20'
                      : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
                  }
                >
                  {idp.enabled !== false ? t('Active') : t('Disabled')}
                </Badge>
                {idp.userCount !== null && idp.userCount !== undefined && idp.userCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {idp.userCount} {t('users')}
                  </Badge>
                )}
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
