import { Button } from '@max-health-inc/shared-ui';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileText, Key, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import type { IdentityProviderWithStats } from '@/lib/types/api';
import { useTranslation } from 'react-i18next';

interface CertificatesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  showCertificates: string | null;
  idps: IdentityProviderWithStats[];
}

/**
 * Format a raw base64 certificate string into PEM format
 */
function formatPem(raw: string): string {
  const cleaned = raw.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g, '');
  const lines = cleaned.match(/.{1,64}/g) ?? [];
  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----`;
}

export function CertificatesDialog({ 
  isOpen, 
  onClose, 
  showCertificates, 
  idps 
}: CertificatesDialogProps) {
  const { t } = useTranslation();
  const idp = idps.find((i) => (i.alias ?? '') === showCertificates);
  const signingCert = idp?.config?.signingCertificate;
  const validateSignature = idp?.config?.validateSignature;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">
                {t('Identity Provider Certificates')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium mt-1">
                {t('Certificates for')} {idp?.displayName ?? idp?.alias ?? t('the selected provider')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Certificate Status */}
          <div className="bg-card/70 p-6 rounded-xl border border-border/50">
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>{t('Certificate Status')}</span>
            </h4>
            {signingCert ? (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800/50">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-green-900 dark:text-green-100">{t('Signing Certificate')}</h5>
                    <span className="text-sm text-green-700 dark:text-green-300">{t('Configured')}</span>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-green-800 dark:text-green-200">
                  <p><span className="font-medium">{t('Provider:')}</span> {idp?.providerId ?? 'unknown'}</p>
                  <p><span className="font-medium">{t('Signature Validation:')}</span> {validateSignature ? t('Enabled') : t('Disabled')}</p>
                  <p><span className="font-medium">{t('Signed AuthN Requests:')}</span> {idp?.config?.wantAuthnRequestsSigned ? t('Required') : t('Not required')}</p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800/50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-amber-900 dark:text-amber-100">{t('No Certificate')}</h5>
                    <span className="text-sm text-amber-700 dark:text-amber-300">
                      {t('No signing certificate is configured for this identity provider.')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Certificate PEM */}
          {signingCert && (
            <div className="bg-card/70 p-6 rounded-xl border border-border/50">
              <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center space-x-2">
                <Key className="w-5 h-5" />
                <span>{t('Certificate Details (PEM Format)')}</span>
              </h4>
              <Textarea
                className="h-48 font-mono text-xs bg-muted/30 dark:bg-muted/50 border-border/50 rounded-xl text-foreground"
                readOnly
                value={formatPem(signingCert)}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end pt-6">
          <Button 
            onClick={onClose} 
            variant="outline" 
            className="px-8 py-3 border-border/50 text-foreground font-semibold rounded-xl hover:bg-muted transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {t('Close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}