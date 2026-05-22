import {
  Shield,
  Lock,
  Key,
  Upload,
  FileText,
  Calendar,
  Info,
} from 'lucide-react';
import { Button } from '@proxy-smart/shared-ui';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { FhirServerWithState } from '@/lib/types/api';
import type { MtlsConfig } from './types';
import { useTranslation } from 'react-i18next';

interface MtlsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: FhirServerWithState | null;
  config: Record<string, MtlsConfig>;
  onConfigChange: (serverId: string, config: MtlsConfig) => void;
  onCertificateUpload: (serverId: string, certType: 'client' | 'key' | 'ca', file: File) => Promise<void>;
  uploadingCerts: boolean;
}

export function MtlsConfigDialog({
  open,
  onOpenChange,
  server,
  config,
  onConfigChange,
  onCertificateUpload,
  uploadingCerts
}: MtlsConfigDialogProps) {
  const { t } = useTranslation();
  const handleMtlsToggle = (serverId: string, enabled: boolean) => {
    const currentConfig = config[serverId] || { enabled: false };
    onConfigChange(serverId, {
      ...currentConfig,
      enabled
    });
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSave = () => {
    // In real implementation, save to backend API
    onOpenChange(false);
  };

  if (!server) return null;

  const serverConfig = config[server.id] || { enabled: false };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            <span>{t('Configure Mutual TLS')}</span>
          </DialogTitle>
          <DialogDescription>
            {t('Configure mutual TLS authentication for "{{name}}". This ensures secure, authenticated communication between the proxy and FHIR server.', { name: server.serverName || server.name })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* mTLS Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
            <div className="flex items-center space-x-3">
              <Lock className="w-5 h-5 text-emerald-600" />
              <div>
                <h4 className="font-semibold text-foreground">{t('Enable Mutual TLS')}</h4>
                <p className="text-sm text-muted-foreground">{t('Require client certificate authentication')}</p>
              </div>
            </div>
            <Button
              variant={serverConfig.enabled ? "default" : "outline"}
              size="sm"
              onClick={() => handleMtlsToggle(server.id, !serverConfig.enabled)}
              className={serverConfig.enabled 
                ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                : "border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10"
              }
            >
              {serverConfig.enabled ? t('Enabled') : t('Disabled')}
            </Button>
          </div>

          {/* Certificate Upload Section */}
          {serverConfig.enabled && (
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground flex items-center space-x-2">
                <Key className="w-4 h-4" />
                <span>{t('Certificates & Keys')}</span>
              </h4>

              {/* Client Certificate */}
              <div className="p-4 border border-border rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-foreground">{t('Client Certificate')}</h5>
                    <p className="text-sm text-muted-foreground">{t('Certificate for proxy to authenticate with FHIR server')}</p>
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".crt,.pem,.cer"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onCertificateUpload(server.id, 'client', file);
                      }}
                    />
                    <Button variant="outline" size="sm" className="border-dashed">
                      <Upload className="w-3 h-3 mr-2" />
                      {t('Upload .crt/.pem')}
                    </Button>
                  </label>
                </div>
                {serverConfig.clientCert && (
                  <div className="flex items-center space-x-2 text-sm text-emerald-600">
                    <FileText className="w-4 h-4" />
                    <span>{serverConfig.clientCert.name}</span>
                  </div>
                )}
              </div>

              {/* Private Key */}
              <div className="p-4 border border-border rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-foreground">{t('Private Key')}</h5>
                    <p className="text-sm text-muted-foreground">{t('Private key corresponding to the client certificate')}</p>
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".key,.pem"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onCertificateUpload(server.id, 'key', file);
                      }}
                    />
                    <Button variant="outline" size="sm" className="border-dashed">
                      <Upload className="w-3 h-3 mr-2" />
                      {t('Upload .key/.pem')}
                    </Button>
                  </label>
                </div>
                {serverConfig.clientKey && (
                  <div className="flex items-center space-x-2 text-sm text-emerald-600">
                    <Key className="w-4 h-4" />
                    <span>{serverConfig.clientKey.name}</span>
                  </div>
                )}
              </div>

              {/* CA Certificate */}
              <div className="p-4 border border-border rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-foreground">{t('CA Certificate')}</h5>
                    <p className="text-sm text-muted-foreground">{t('Certificate Authority to verify FHIR server certificate')}</p>
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".crt,.pem,.cer"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onCertificateUpload(server.id, 'ca', file);
                      }}
                    />
                    <Button variant="outline" size="sm" className="border-dashed">
                      <Upload className="w-3 h-3 mr-2" />
                      {t('Upload .crt/.pem')}
                    </Button>
                  </label>
                </div>
                {serverConfig.caCert && (
                  <div className="flex items-center space-x-2 text-sm text-emerald-600">
                    <Shield className="w-4 h-4" />
                    <span>{serverConfig.caCert.name}</span>
                  </div>
                )}
              </div>

              {/* Certificate Details */}
              {serverConfig.certDetails && (
                <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <h5 className="font-medium text-emerald-800 dark:text-emerald-200 mb-3 flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>{t('Certificate Details')}</span>
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-emerald-700 dark:text-emerald-300">{t('Subject:')}</span>
                      <span className="text-emerald-800 dark:text-emerald-200 font-mono text-xs">
                        {serverConfig.certDetails.subject}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-700 dark:text-emerald-300">{t('Issuer:')}</span>
                      <span className="text-emerald-800 dark:text-emerald-200 font-mono text-xs">
                        {serverConfig.certDetails.issuer}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-700 dark:text-emerald-300">{t('Valid Until:')}</span>
                      <span className="text-emerald-800 dark:text-emerald-200 flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(serverConfig.certDetails.validTo).toLocaleDateString()}</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-700 dark:text-emerald-300">{t('Fingerprint:')}</span>
                      <span className="text-emerald-800 dark:text-emerald-200 font-mono text-xs">
                        {serverConfig.certDetails.fingerprint}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Notice */}
              <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-2">{t('Security Best Practices:')}</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>{t('Ensure private keys are never shared or transmitted over insecure channels')}</li>
                      <li>{t('Use strong certificate passwords and rotate certificates regularly')}</li>
                      <li>{t('Verify that the FHIR server is configured to require client certificates')}</li>
                      <li>{t('Monitor certificate expiration dates and renew before expiry')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={uploadingCerts}
          >
            {t('Cancel')}
          </Button>
          <LoadingButton
            type="button"
            onClick={handleSave}
            loading={uploadingCerts}
            loadingText={t('Saving...')}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Shield className="w-4 h-4 mr-2" />
            {t('Save Configuration')}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}