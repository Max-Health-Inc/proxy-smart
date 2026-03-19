import { Button } from '@proxy-smart/shared-ui';
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

interface CertificatesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  showCertificates: string | null;
  idps: IdentityProviderWithStats[];
}

export function CertificatesDialog({ 
  isOpen, 
  onClose, 
  showCertificates, 
  idps 
}: CertificatesDialogProps) {
  const idp = idps.find((i) => (i.alias ?? '') === showCertificates);

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
                Identity Provider Certificates
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium mt-1">
                View and manage certificates for {idp?.displayName ?? idp?.alias ?? 'the selected provider'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Certificate Status Overview */}
          <div className="bg-card/70 p-6 rounded-xl border border-border/50">
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Certificate Status</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800/50">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-green-900 dark:text-green-100">Signing Certificate</h5>
                    <span className="text-sm text-green-700 dark:text-green-300">Valid & Active</span>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-green-800 dark:text-green-200">
                  <p><span className="font-medium">Subject:</span> CN=hospital.example.com</p>
                  <p><span className="font-medium">Issuer:</span> DigiCert Inc</p>
                  <p><span className="font-medium">Valid Until:</span> 2025-12-31</p>
                  <p><span className="font-medium">Algorithm:</span> RSA-SHA256</p>
                </div>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800/50">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-amber-900 dark:text-amber-100">Encryption Certificate</h5>
                    <span className="text-sm text-amber-700 dark:text-amber-300">Expires Soon</span>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
                  <p><span className="font-medium">Subject:</span> CN=hospital.example.com</p>
                  <p><span className="font-medium">Issuer:</span> DigiCert Inc</p>
                  <p><span className="font-medium">Valid Until:</span> 2025-01-15</p>
                  <p><span className="font-medium">Algorithm:</span> RSA-SHA256</p>
                </div>
              </div>
            </div>
          </div>

          {/* Certificate Details */}
          <div className="bg-card/70 p-6 rounded-xl border border-border/50">
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center space-x-2">
              <Key className="w-5 h-5" />
              <span>Certificate Details (PEM Format)</span>
            </h4>
            <Textarea
              className="h-48 font-mono text-xs bg-muted/30 dark:bg-muted/50 border-border/50 rounded-xl text-foreground"
              readOnly
              value={`-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKoK/heBjcOuMA0GCSqGSIb3DQEBBQUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMTMwODI3MjM0NjUwWhcNMjMwODI1MjM0NjUwWjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAvpnaPKLIKdvx98KW68lz8pGaRRcYersNGqPjpifMVjjE8LuCoXgPU0HePK
-----END CERTIFICATE-----`}
            />
          </div>
        </div>

        <div className="flex justify-between pt-6">
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              className="px-6 py-3 border-border/50 text-foreground font-semibold rounded-xl hover:bg-muted transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <FileText className="w-4 h-4 mr-2" />
              Download Certificate
            </Button>
            <Button 
              variant="outline"
              className="px-6 py-3 border-border/50 text-foreground font-semibold rounded-xl hover:bg-muted transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Shield className="w-4 h-4 mr-2" />
              Verify Certificate
            </Button>
          </div>
          <Button 
            onClick={onClose} 
            variant="outline" 
            className="px-8 py-3 border-border/50 text-foreground font-semibold rounded-xl hover:bg-muted transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}