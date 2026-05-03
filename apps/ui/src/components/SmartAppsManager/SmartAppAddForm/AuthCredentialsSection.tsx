import { Input, Label } from '@proxy-smart/shared-ui';
import { Textarea } from '@/components/ui/textarea';
import { Shield, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SmartAppFormData } from '@/lib/types/api';
import { hasFixedAuthType } from './helpers';

interface AuthCredentialsSectionProps {
    newApp: SmartAppFormData;
    updateApp: (patch: Partial<SmartAppFormData>) => void;
}

export function AuthCredentialsSection({ newApp, updateApp }: AuthCredentialsSectionProps) {
    const { t } = useTranslation();

    const showAsymmetric = newApp.authenticationType === 'asymmetric' || hasFixedAuthType(newApp.appType!);
    const showSymmetric = newApp.authenticationType === 'symmetric' && !hasFixedAuthType(newApp.appType!);

    if (!showAsymmetric && !showSymmetric) return null;

    if (showAsymmetric) {
        return (
            <div className="space-y-6 p-6 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center shadow-sm">
                        <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Asymmetric Authentication')}</h4>
                        <p className="text-muted-foreground text-sm font-medium">{t('Provide JWKS URI or public key for JWT signature verification')}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label htmlFor="jwksUri" className="text-sm font-semibold text-foreground">{t('JWKS URI')}</Label>
                    <Input
                        id="jwksUri"
                        type="url"
                        placeholder="https://your-app.com/.well-known/jwks.json"
                        value={newApp.jwksUri || ''}
                        onChange={(e) => updateApp({ jwksUri: e.target.value })}
                        className="rounded-xl border-input focus:border-ring focus:ring-ring shadow-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                        {t('URL endpoint where the proxy can fetch your app\'s public keys for JWT verification')}
                    </p>
                </div>

                <div className="space-y-3">
                    <Label htmlFor="publicKey" className="text-sm font-semibold text-foreground">{t('Public Key (Alternative)')}</Label>
                    <Textarea
                        id="publicKey"
                        placeholder="-----BEGIN PUBLIC KEY-----&#10;MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...&#10;-----END PUBLIC KEY-----"
                        value={newApp.publicKey || ''}
                        onChange={(e) => updateApp({ publicKey: e.target.value })}
                        className="min-h-[100px] rounded-xl shadow-sm font-mono"
                        rows={6}
                    />
                    <p className="text-xs text-muted-foreground">
                        {t('Provide a public key directly if not using JWKS URI. Supports PEM format (RSA, EC).')}
                    </p>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                            <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">{t('Authentication Options')}</p>
                            <p className="text-blue-700 dark:text-blue-400 text-xs">
                                {t('You can provide either a JWKS URI or a public key directly. The JWKS URI is recommended as it allows for key rotation. If both are provided, the JWKS URI takes precedence.')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 bg-rose-500/10 rounded-xl border border-rose-500/20">
            <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center shadow-sm">
                    <Shield className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                    <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Symmetric Authentication')}</h4>
                    <p className="text-muted-foreground text-sm font-medium">{t('Store a shared secret for client authentication')}</p>
                </div>
            </div>

            <div className="space-y-3">
                <Label htmlFor="clientSecret" className="text-sm font-semibold text-foreground">{t('Client Secret')}</Label>
                <Input
                    id="clientSecret"
                    type="password"
                    placeholder={t('Enter shared secret')}
                    value={newApp.secret || ''}
                    onChange={(e) => updateApp({ secret: e.target.value })}
                    className="rounded-xl border-input focus:border-ring focus:ring-ring shadow-sm font-mono"
                />
                <p className="text-xs text-muted-foreground">
                    {t('A shared secret used for symmetric client authentication. Keep this secure and never expose it in client-side code.')}
                </p>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                        <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">{t('Security Warning')}</p>
                        <p className="text-amber-700 dark:text-amber-400 text-xs">
                            {t('Symmetric authentication (client secrets) is less secure than asymmetric authentication (JWT with public/private keys). Use asymmetric authentication when possible, especially for production deployments.')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
