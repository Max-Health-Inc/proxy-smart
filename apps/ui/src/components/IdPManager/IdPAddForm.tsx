import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@proxy-smart/shared-ui';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import type { IdentityProviderFormData } from '@/lib/types/api';
import { useTranslation } from 'react-i18next';

interface IdPAddFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  newIdp: IdentityProviderFormData;
  setNewIdp: (
    idp:
      | IdentityProviderFormData
      | ((previous: IdentityProviderFormData) => IdentityProviderFormData)
  ) => void;
}

export function IdPAddForm({ isOpen, onClose, onSubmit, newIdp, setNewIdp }: IdPAddFormProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const updateConfig = <K extends keyof IdentityProviderFormData['config']>(
    key: K,
    value: IdentityProviderFormData['config'][K]
  ) => {
    setNewIdp((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value,
      },
    }));
  };

  return (
    <div className="bg-card/70 backdrop-blur-sm p-8 rounded-2xl border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
            <Plus className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground tracking-tight">{t('Add New Identity Provider')}</h3>
            <p className="text-muted-foreground font-medium">{t('Configure a new identity provider for healthcare system authentication')}</p>
          </div>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="displayName" className="text-sm font-semibold text-foreground">{t('Display Name')}</Label>
            <Input
              id="displayName"
              placeholder="e.g., Hospital Azure AD"
              value={newIdp.displayName ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                setNewIdp((prev) => ({
                  ...prev,
                  displayName: value,
                  alias: prev.alias || value.toLowerCase().replace(/\s+/g, '-'),
                  config: {
                    ...prev.config,
                    displayName: value,
                  },
                }));
              }}
              className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
              required
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="alias" className="text-sm font-semibold text-foreground">{t('Alias (unique identifier)')}</Label>
            <Input
              id="alias"
              placeholder="e.g., hospital-azure-ad"
              value={newIdp.alias}
              onChange={(e) => setNewIdp({ ...newIdp, alias: e.target.value })}
              className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="vendor" className="text-sm font-semibold text-foreground">{t('Provider Vendor')}</Label>
            <Input
              id="vendor"
              placeholder="e.g., Microsoft Azure, Google, Okta"
              value={newIdp.vendorName ?? ''}
              onChange={(e) => setNewIdp({ ...newIdp, vendorName: e.target.value })}
              className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="enabled" className="text-sm font-semibold text-foreground">{t('Enable Provider Immediately')}</Label>
            <div className="flex items-center space-x-3 h-12 px-4 rounded-xl border border-border/50 bg-background">
              <Checkbox
                id="enabled"
                checked={newIdp.enabled ?? true}
                onCheckedChange={(checked) => setNewIdp({ ...newIdp, enabled: checked === true })}
              />
              <span className="text-sm text-foreground">{t('Enabled')}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="type" className="text-sm font-semibold text-foreground">{t('Authentication Type')}</Label>
            <Select
              value={(newIdp.providerId ?? 'saml').toUpperCase()}
              onValueChange={(value) => setNewIdp({ ...newIdp, providerId: value.toLowerCase() })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SAML">{t('SAML 2.0')}</SelectItem>
                <SelectItem value="OAUTH2">{t('OAuth 2.0')}</SelectItem>
                <SelectItem value="OIDC">{t('OpenID Connect')}</SelectItem>
                <SelectItem value="LDAP">LDAP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label htmlFor="entityId" className="text-sm font-semibold text-foreground">{t('Entity ID / Client ID')}</Label>
            <Input
              id="entityId"
              placeholder={t('Entity identifier or client ID')}
              value={newIdp.config.entityId ?? ''}
              onChange={(e) => updateConfig('entityId', e.target.value)}
              className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
              required
            />
          </div>
        </div>
        <div className="space-y-3">
          <Label htmlFor="ssoUrl" className="text-sm font-semibold text-foreground">{t('SSO URL / Authorization Endpoint')}</Label>
          <Input
            id="ssoUrl"
            type="url"
            placeholder="https://login.provider.com/sso"
            value={newIdp.config.singleSignOnServiceUrl ?? ''}
            onChange={(e) => updateConfig('singleSignOnServiceUrl', e.target.value)}
            className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
            required
          />
        </div>

        {/* Additional Configuration Fields */}
        <div className="mt-8 pt-6 border-t border-border/50">
          <h4 className="text-lg font-semibold text-foreground mb-4">{t('Additional Configuration')}</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <Label htmlFor="configDisplayName" className="text-sm font-semibold text-foreground">{t('UI Display Override')}</Label>
              <Input
                id="configDisplayName"
                placeholder={t('Friendly name for login screens')}
                value={newIdp.config.displayName ?? ''}
                onChange={(e) => updateConfig('displayName', e.target.value)}
                className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="issuer" className="text-sm font-semibold text-foreground">{t('Issuer')}</Label>
              <Input
                id="issuer"
                placeholder={t('Identity provider issuer URL')}
                value={newIdp.config.issuer ?? ''}
                onChange={(e) => updateConfig('issuer', e.target.value)}
                className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
              />
            </div>
          </div>

          {/* OIDC/OAuth2 specific fields */}
          {(['oidc', 'oauth2'].includes((newIdp.providerId ?? '').toLowerCase())) && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="clientSecret" className="text-sm font-semibold text-foreground">{t('Client Secret')}</Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    placeholder={t('OAuth2/OIDC client secret')}
                    value={newIdp.config.clientSecret ?? ''}
                    onChange={(e) => updateConfig('clientSecret', e.target.value)}
                    className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="tokenUrl" className="text-sm font-semibold text-foreground">{t('Token URL')}</Label>
                  <Input
                    id="tokenUrl"
                    type="url"
                    placeholder="https://login.provider.com/token"
                    value={newIdp.config.tokenUrl ?? ''}
                    onChange={(e) => updateConfig('tokenUrl', e.target.value)}
                    className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="userInfoUrl" className="text-sm font-semibold text-foreground">{t('User Info URL')}</Label>
                  <Input
                    id="userInfoUrl"
                    type="url"
                    placeholder="https://login.provider.com/userinfo"
                    value={newIdp.config.userInfoUrl ?? ''}
                    onChange={(e) => updateConfig('userInfoUrl', e.target.value)}
                    className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="defaultScopes" className="text-sm font-semibold text-foreground">{t('Default Scopes')}</Label>
                  <Input
                    id="defaultScopes"
                    placeholder="openid profile email"
                    value={newIdp.config.defaultScopes ?? ''}
                    onChange={(e) => updateConfig('defaultScopes', e.target.value)}
                    className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SAML specific fields */}
          {(newIdp.providerId ?? '').toLowerCase() === 'saml' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="signatureAlgorithm" className="text-sm font-semibold text-foreground">{t('Signature Algorithm')}</Label>
                  <Select
                    value={newIdp.config.signatureAlgorithm ?? 'RS256'}
                    onValueChange={(value) => updateConfig('signatureAlgorithm', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RS256">{t('RSA-SHA256')}</SelectItem>
                      <SelectItem value="RS384">{t('RSA-SHA384')}</SelectItem>
                      <SelectItem value="RS512">{t('RSA-SHA512')}</SelectItem>
                      <SelectItem value="ES256">{t('ECDSA-SHA256')}</SelectItem>
                      <SelectItem value="ES384">{t('ECDSA-SHA384')}</SelectItem>
                      <SelectItem value="ES512">{t('ECDSA-SHA512')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="nameIdFormat" className="text-sm font-semibold text-foreground">{t('NameID Format')}</Label>
                  <Select
                    value={newIdp.config.nameIdPolicyFormat ?? 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent'}
                    onValueChange={(value) => updateConfig('nameIdPolicyFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent">{t('Persistent')}</SelectItem>
                      <SelectItem value="urn:oasis:names:tc:SAML:2.0:nameid-format:transient">{t('Transient')}</SelectItem>
                      <SelectItem value="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">{t('Email Address')}</SelectItem>
                      <SelectItem value="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">{t('Unspecified')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="certificate" className="text-sm font-semibold text-foreground">X.509 Certificate</Label>
                <Textarea
                  id="certificate"
                  placeholder="-----BEGIN CERTIFICATE-----&#10;MIIBIjANBgkqhkiG9w0BAQ...&#10;-----END CERTIFICATE-----"
                  value={newIdp.config.signingCertificate ?? ''}
                  onChange={(e) => updateConfig('signingCertificate', e.target.value)}
                  className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm min-h-[120px]"
                  rows={5}
                />
              </div>
            </div>
          )}

          {/* Common additional fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-3">
              <Label htmlFor="logoutUrl" className="text-sm font-semibold text-foreground">{t('Logout URL')}</Label>
              <Input
                id="logoutUrl"
                type="url"
                placeholder="https://login.provider.com/logout"
                value={newIdp.config.logoutUrl ?? newIdp.config.singleLogoutServiceUrl ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewIdp((prev) => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      logoutUrl: value,
                      singleLogoutServiceUrl: value,
                    },
                  }));
                }}
                className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="metadataUrl" className="text-sm font-semibold text-foreground">{t('Metadata URL')}</Label>
              <Input
                id="metadataUrl"
                type="url"
                placeholder="https://login.provider.com/.well-known/metadata"
                value={newIdp.config.metadataDescriptorUrl ?? ''}
                onChange={(e) => updateConfig('metadataDescriptorUrl', e.target.value)}
                className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
              />
            </div>
          </div>

          {/* Security Options */}
          <div className="mt-6 pt-4 border-t border-border/50">
            <h5 className="text-md font-semibold text-foreground mb-4">{t('Security Options')}</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="validateSignature"
                  checked={newIdp.config.validateSignature ?? false}
                  onCheckedChange={(checked) => updateConfig('validateSignature', checked === true)}
                />
                <Label htmlFor="validateSignature" className="text-sm text-foreground">{t('Validate Signature')}</Label>
              </div>
              {(newIdp.providerId ?? '').toLowerCase() === 'saml' && (
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="wantAuthnRequestsSigned"
                    checked={newIdp.config.wantAuthnRequestsSigned ?? false}
                    onCheckedChange={(checked) => updateConfig('wantAuthnRequestsSigned', checked === true)}
                  />
                  <Label htmlFor="wantAuthnRequestsSigned" className="text-sm text-foreground">{t('Want AuthnRequests Signed')}</Label>
                </div>
              )}
            </div>
          </div>

          {/* Identity Linking */}
          <div className="mt-6 pt-4 border-t border-border/50">
            <h5 className="text-md font-semibold text-foreground mb-2">{t('Identity Linking')}</h5>
            <p className="text-sm text-muted-foreground mb-4">
              {t('Controls how Keycloak links accounts when a user logs in via this provider for the first time.')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-3">
                <Label htmlFor="firstBrokerLoginFlowAlias" className="text-sm font-semibold text-foreground">{t('First Broker Login Flow')}</Label>
                <Input
                  id="firstBrokerLoginFlowAlias"
                  placeholder="first broker login"
                  value={newIdp.firstBrokerLoginFlowAlias ?? ''}
                  onChange={(e) => setNewIdp((prev) => ({ ...prev, firstBrokerLoginFlowAlias: e.target.value }))}
                  className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
                />
                <p className="text-xs text-muted-foreground">{t('Authentication flow triggered on first login via this IdP.')}</p>
              </div>
              <div className="space-y-3">
                <Label htmlFor="postBrokerLoginFlowAlias" className="text-sm font-semibold text-foreground">{t('Post Broker Login Flow')}</Label>
                <Input
                  id="postBrokerLoginFlowAlias"
                  placeholder="(optional)"
                  value={newIdp.postBrokerLoginFlowAlias ?? ''}
                  onChange={(e) => setNewIdp((prev) => ({ ...prev, postBrokerLoginFlowAlias: e.target.value }))}
                  className="rounded-xl border-border/50 focus:border-ring focus:ring-ring shadow-sm"
                />
                <p className="text-xs text-muted-foreground">{t('Authentication flow triggered after every broker login.')}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="trustEmail"
                  checked={newIdp.trustEmail ?? false}
                  onCheckedChange={(checked) => setNewIdp((prev) => ({ ...prev, trustEmail: checked === true }))}
                />
                <div>
                  <Label htmlFor="trustEmail" className="text-sm text-foreground">{t('Trust Email')}</Label>
                  <p className="text-xs text-muted-foreground">{t('Auto-verify email from this IdP and use it for account linking.')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="linkOnly"
                  checked={newIdp.linkOnly ?? false}
                  onCheckedChange={(checked) => setNewIdp((prev) => ({ ...prev, linkOnly: checked === true }))}
                />
                <div>
                  <Label htmlFor="linkOnly" className="text-sm text-foreground">{t('Link Only')}</Label>
                  <p className="text-xs text-muted-foreground">{t('Only link to existing accounts, never create new users.')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="hideOnLogin"
                  checked={newIdp.hideOnLogin ?? false}
                  onCheckedChange={(checked) => setNewIdp((prev) => ({ ...prev, hideOnLogin: checked === true }))}
                />
                <div>
                  <Label htmlFor="hideOnLogin" className="text-sm text-foreground">{t('Hide on Login Page')}</Label>
                  <p className="text-xs text-muted-foreground">{t('Hide this IdP from the Keycloak login page.')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-4 pt-4">
          <Button 
            type="submit"
          >
            {t('Add Identity Provider')}
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
    </div>
  );
}