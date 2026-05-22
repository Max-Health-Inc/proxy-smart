// mTLS Configuration type (local UI type with File references, distinct from API client MtlsConfig)
export interface MtlsConfig {
  enabled: boolean;
  clientCert?: File;
  clientKey?: File;
  caCert?: File;
  certDetails?: {
    subject: string;
    issuer: string;
    validFrom: string;
    validTo: string;
    fingerprint: string;
  };
}
