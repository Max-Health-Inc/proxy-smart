import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@max-health-inc/shared-ui';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Edit, Shield } from 'lucide-react';
import type { IdentityProviderFormData } from '@/lib/types/api';
import { useTranslation } from 'react-i18next';

interface IdPEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (idp: IdentityProviderFormData) => Promise<void>;
  editingIdp: IdentityProviderFormData | null;
  setEditingIdp: (
    idp: IdentityProviderFormData | null
      | ((previous: IdentityProviderFormData | null) => IdentityProviderFormData | null)
  ) => void;
}

export function IdPEditDialog({ 
  isOpen, 
  onClose, 
  onUpdate, 
  editingIdp, 
  setEditingIdp 
}: IdPEditDialogProps) {
  const { t } = useTranslation();
  if (!editingIdp) return null;

  const updateConfig = <K extends keyof IdentityProviderFormData['config']>(
    key: K,
    value: IdentityProviderFormData['config'][K]
  ) => {
    setEditingIdp((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        config: {
          ...prev.config,
          [key]: value,
        },
      };
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <Edit className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">
                {t('Edit Identity Provider')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium mt-1">
                Modify the configuration for {editingIdp.displayName ?? editingIdp.alias}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={(e) => {
          e.preventDefault();
          onUpdate(editingIdp);
        }} className="space-y-6">
          {/* Basic Configuration */}
          <div className="bg-card/70 p-6 rounded-xl border border-border/50">
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>{t('Basic Configuration')}</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="edit-displayName" className="text-sm font-semibold text-foreground">{t('Display Name')}</Label>
                <Input
                  id="edit-displayName"
                  value={editingIdp.displayName ?? ''}
                  onChange={(e) => setEditingIdp({ ...editingIdp, displayName: e.target.value })}
                  className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-alias" className="text-sm font-semibold text-foreground">{t('Alias')}</Label>
                <Input
                  id="edit-alias"
                  value={editingIdp.alias}
                  readOnly
                  className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm bg-muted"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-3">
                <Label htmlFor="edit-vendor" className="text-sm font-semibold text-foreground">{t('Provider Vendor')}</Label>
                <Input
                  id="edit-vendor"
                  value={editingIdp.vendorName ?? ''}
                  onChange={(e) => setEditingIdp({ ...editingIdp, vendorName: e.target.value })}
                  className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-type" className="text-sm font-semibold text-foreground">{t('Authentication Type')}</Label>
                <Select
                  value={(editingIdp.providerId ?? 'saml').toUpperCase()}
                  onValueChange={(value) => setEditingIdp({ ...editingIdp, providerId: value.toLowerCase() })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAML">{t('SAML 2.0')}</SelectItem>
                    <SelectItem value="OAuth2">{t('OAuth 2.0')}</SelectItem>
                    <SelectItem value="OIDC">{t('OpenID Connect')}</SelectItem>
                    <SelectItem value="LDAP">LDAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-entityId" className="text-sm font-semibold text-foreground">{t('Entity ID / Client ID')}</Label>
                <Input
                  id="edit-entityId"
                  value={editingIdp.config.entityId ?? ''}
                  onChange={(e) => updateConfig('entityId', e.target.value)}
                  className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
                />
              </div>
            </div>
            <div className="space-y-3 mt-6">
              <Label htmlFor="edit-ssoUrl" className="text-sm font-semibold text-foreground">{t('SSO URL / Authorization Endpoint')}</Label>
              <Input
                id="edit-ssoUrl"
                value={editingIdp.config.singleSignOnServiceUrl ?? ''}
                onChange={(e) => updateConfig('singleSignOnServiceUrl', e.target.value)}
                className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
              />
            </div>
          </div>

          {/* Security Toggle */}
          <div className="bg-card/70 p-6 rounded-xl border border-border/50">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="edit-enabled"
                checked={editingIdp.enabled ?? true}
                onCheckedChange={(checked) => setEditingIdp({ ...editingIdp, enabled: checked === true })}
              />
              <Label htmlFor="edit-enabled" className="text-sm text-foreground">{t('Enabled')}</Label>
            </div>
          </div>

          {/* Identity Linking */}
          <div className="bg-card/70 p-6 rounded-xl border border-border/50">
            <h4 className="text-lg font-semibold text-foreground mb-2 flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>{t('Identity Linking')}</span>
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              {t('Controls how Keycloak links accounts when a user logs in via this provider for the first time.')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-3">
                <Label htmlFor="edit-firstBrokerLoginFlowAlias" className="text-sm font-semibold text-foreground">{t('First Broker Login Flow')}</Label>
                <Input
                  id="edit-firstBrokerLoginFlowAlias"
                  placeholder="first broker login"
                  value={editingIdp.firstBrokerLoginFlowAlias ?? ''}
                  onChange={(e) => setEditingIdp({ ...editingIdp, firstBrokerLoginFlowAlias: e.target.value })}
                  className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
                />
                <p className="text-xs text-muted-foreground">{t('Authentication flow triggered on first login via this IdP.')}</p>
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-postBrokerLoginFlowAlias" className="text-sm font-semibold text-foreground">{t('Post Broker Login Flow')}</Label>
                <Input
                  id="edit-postBrokerLoginFlowAlias"
                  placeholder="(optional)"
                  value={editingIdp.postBrokerLoginFlowAlias ?? ''}
                  onChange={(e) => setEditingIdp({ ...editingIdp, postBrokerLoginFlowAlias: e.target.value })}
                  className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
                />
                <p className="text-xs text-muted-foreground">{t('Authentication flow triggered after every broker login.')}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="edit-trustEmail"
                  checked={editingIdp.trustEmail ?? false}
                  onCheckedChange={(checked) => setEditingIdp({ ...editingIdp, trustEmail: checked === true })}
                />
                <div>
                  <Label htmlFor="edit-trustEmail" className="text-sm text-foreground">{t('Trust Email')}</Label>
                  <p className="text-xs text-muted-foreground">{t('Auto-verify email from this IdP and use it for account linking.')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="edit-linkOnly"
                  checked={editingIdp.linkOnly ?? false}
                  onCheckedChange={(checked) => setEditingIdp({ ...editingIdp, linkOnly: checked === true })}
                />
                <div>
                  <Label htmlFor="edit-linkOnly" className="text-sm text-foreground">{t('Link Only')}</Label>
                  <p className="text-xs text-muted-foreground">{t('Only link to existing accounts, never create new users.')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="edit-hideOnLogin"
                  checked={editingIdp.hideOnLogin ?? false}
                  onCheckedChange={(checked) => setEditingIdp({ ...editingIdp, hideOnLogin: checked === true })}
                />
                <div>
                  <Label htmlFor="edit-hideOnLogin" className="text-sm text-foreground">{t('Hide on Login Page')}</Label>
                  <p className="text-xs text-muted-foreground">{t('Hide this IdP from the Keycloak login page.')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              type="submit" 
            >
              {t('Update Provider')}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
            >
              {t('Cancel')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}