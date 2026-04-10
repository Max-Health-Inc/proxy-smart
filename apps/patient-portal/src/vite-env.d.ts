/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROXY_BASE: string
  readonly VITE_PROXY_PREFIX: string
  readonly VITE_FHIR_SERVER_ID: string
  readonly VITE_FHIR_VERSION: string
  readonly VITE_CLIENT_ID: string
  readonly VITE_REDIRECT_URI: string
  readonly VITE_SCOPES: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
