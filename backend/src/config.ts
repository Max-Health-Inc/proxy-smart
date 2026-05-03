import { readFileSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { randomBytes } from 'crypto'

// Per-process fallback secret for EHR Launch codes when SMART_LAUNCH_SECRET is not set.
// WARNING: This is NOT safe for multi-node deployments — set SMART_LAUNCH_SECRET env var.
const _defaultLaunchSecret = randomBytes(32).toString('hex')

// Get package.json path - try multiple strategies for robustness
let packageJson: { name: string; displayName?: string; version: string }
try {
  // Strategy 1: Use import.meta.url (works in ES modules)
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const packageJsonPath = join(__dirname, '..', 'package.json')
  packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
} catch {
  // Strategy 2: Use process.cwd() (works in Bun)
  try {
    const packageJsonPath = resolve(process.cwd(), 'package.json')
    packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
  } catch {
    // Strategy 3: Fallback defaults
    packageJson = {
      name: 'proxy-smart-backend',
      displayName: 'Proxy Smart Backend',
      version: '0.0.1-alpha'
    }
  }
}

/**
 * Application configuration from environment variables
 */
export const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:8445',
  port: process.env.PORT || 8445,
  
  // Application name and version from package.json
  name: packageJson.name,
  displayName: packageJson.displayName || packageJson.name,
  version: packageJson.version,
  
  keycloak: {
    // Dynamic getters that read from process.env for real-time updates
    get baseUrl() {
      return process.env.KEYCLOAK_BASE_URL || null
    },
    
    get realm() {
      return process.env.KEYCLOAK_REALM || null
    },
    
    get adminClientId() {
      return process.env.KEYCLOAK_ADMIN_CLIENT_ID || null
    },
    
    get adminClientSecret() {
      return process.env.KEYCLOAK_ADMIN_CLIENT_SECRET || null
    },
    
    // Check if Keycloak is configured
    get isConfigured() {
      return !!(this.baseUrl && this.realm)
    },
    
    // Public URL for browser redirects (defaults to baseUrl if not specified)
    get publicUrl() {
      if (process.env.KEYCLOAK_PUBLIC_URL) return process.env.KEYCLOAK_PUBLIC_URL
      if (!this.baseUrl) return null
      const domain = process.env.KEYCLOAK_DOMAIN;
      if (!domain) return this.baseUrl
      // Use regex to replace the hostname in the URL, preserving protocol and port
      return this.baseUrl.replace(/\/\/([^:/]+)(:[0-9]+)?/, `//${domain}$2`)
    },
    
    // Dynamically construct JWKS URI from base URL and realm
    get jwksUri() {
      if (!this.baseUrl || !this.realm) return null
      return `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/certs`
    },

    // Expected token issuer — used for JWT issuer validation
    // Tokens from Keycloak have iss = <publicUrl>/realms/<realm>
    get expectedIssuer() {
      const base = this.publicUrl || this.baseUrl
      if (!base || !this.realm) return null
      return `${base}/realms/${this.realm}`
    },
  },
  
  fhir: {
    // Support multiple FHIR servers - can be a single URL or comma-separated list
    serverBases: (process.env.FHIR_SERVER_BASE ?? 'http://localhost:8081/fhir').split(',').map(s => s.trim()),
    supportedVersions: process.env.FHIR_SUPPORTED_VERSIONS?.split(',').map(s => s.trim()) || ['R4'],
  },

  smart: {
    configCacheTtl: parseInt(process.env.SMART_CONFIG_CACHE_TTL || '300000'), // 5 minutes
    scopesSupported: process.env.SMART_SCOPES_SUPPORTED?.split(',').map(s => s.trim()),
    capabilities: process.env.SMART_CAPABILITIES?.split(',').map(s => s.trim()),
    // HMAC secret for signing EHR Launch codes (stateless JWT).
    // Auto-generated per process if not set — multi-node deployments MUST set this.
    get launchSecret(): string {
      return process.env.SMART_LAUNCH_SECRET || _defaultLaunchSecret
    },
    // Launch code TTL in seconds (default 5 minutes)
    get launchCodeTtlSeconds(): number {
      return parseInt(process.env.SMART_LAUNCH_CODE_TTL || '300', 10)
    },
  },

  // User-Access Brands (SMART App Launch 2.2.0 Section 8)
  brand: {
    get name() { return process.env.BRAND_NAME || packageJson.displayName || packageJson.name },
    get website() { return process.env.BRAND_WEBSITE || process.env.BASE_URL || 'http://localhost:8445' },
    get logoUrl() { return process.env.BRAND_LOGO_URL || null },
    get logoLicenseUrl() { return process.env.BRAND_LOGO_LICENSE_URL || null },
    get aliases(): string[] {
      return process.env.BRAND_ALIASES?.split(',').map(s => s.trim()).filter(Boolean) || []
    },
    get category() { return process.env.BRAND_CATEGORY || 'prov' }, // prov, pay, laboratory, etc.
    get portalName() { return process.env.BRAND_PORTAL_NAME || null },
    get portalUrl() { return process.env.BRAND_PORTAL_URL || null },
    get portalDescription() { return process.env.BRAND_PORTAL_DESCRIPTION || null },
    get portalLogoUrl() { return process.env.BRAND_PORTAL_LOGO_URL || null },
    get portalLogoLicenseUrl() { return process.env.BRAND_PORTAL_LOGO_LICENSE_URL || null },
    get addressCity() { return process.env.BRAND_ADDRESS_CITY || null },
    get addressState() { return process.env.BRAND_ADDRESS_STATE || null },
    get addressPostalCode() { return process.env.BRAND_ADDRESS_POSTAL_CODE || null },
    get addressCountry() { return process.env.BRAND_ADDRESS_COUNTRY || null },
    get identifier() { return process.env.BRAND_IDENTIFIER || process.env.BRAND_WEBSITE || process.env.BASE_URL || 'http://localhost:8445' },
    get loginTheme(): string | null { return process.env.BRAND_LOGIN_THEME || null },
  },

  ai: {
    get enabled() {
      return !!this.openaiApiKey;
    },
    get openaiApiKey() {
      return process.env.OPENAI_API_KEY || null;
    },
    get timeoutMs() {
      return Number.parseInt(process.env.AI_TIMEOUT_MS || '30000', 10); // 30 seconds for reasoning models
    }
  },

  consent: {
    // Consent enforcement configuration
    get enabled() {
      return process.env.CONSENT_ENABLED === 'true'
    },
    get mode(): 'enforce' | 'audit-only' | 'disabled' {
      const mode = process.env.CONSENT_MODE || 'disabled'
      if (mode === 'enforce' || mode === 'audit-only' || mode === 'disabled') {
        return mode
      }
      return 'disabled'
    },
    get cacheTtl() {
      return parseInt(process.env.CONSENT_CACHE_TTL || '60000', 10) // 1 minute default
    },
    get exemptClients(): string[] {
      return process.env.CONSENT_EXEMPT_CLIENTS?.split(',').map(s => s.trim()).filter(Boolean) || []
    },
    get requiredForResourceTypes(): string[] {
      return process.env.CONSENT_REQUIRED_RESOURCE_TYPES?.split(',').map(s => s.trim()).filter(Boolean) || []
    },
    get exemptResourceTypes(): string[] {
      // By default, exempt metadata and capability statement
      const defaults = ['CapabilityStatement', 'metadata']
      const env = process.env.CONSENT_EXEMPT_RESOURCE_TYPES?.split(',').map(s => s.trim()).filter(Boolean) || []
      return [...new Set([...defaults, ...env])]
    }
  },

  ial: {
    // Identity Assurance Level (IAL) configuration for Person→Patient linking
    get enabled() {
      return process.env.IAL_ENABLED === 'true'
    },
    get minimumLevel(): 'level1' | 'level2' | 'level3' | 'level4' {
      const level = process.env.IAL_MINIMUM_LEVEL || 'level1'
      if (['level1', 'level2', 'level3', 'level4'].includes(level)) {
        return level as 'level1' | 'level2' | 'level3' | 'level4'
      }
      return 'level1'
    },
    get sensitiveResourceTypes(): string[] {
      // Resources requiring elevated IAL (e.g., MedicationRequest, DiagnosticReport)
      return process.env.IAL_SENSITIVE_RESOURCE_TYPES?.split(',').map(s => s.trim()).filter(Boolean) || []
    },
    get sensitiveMinimumLevel(): 'level1' | 'level2' | 'level3' | 'level4' {
      const level = process.env.IAL_SENSITIVE_MINIMUM_LEVEL || 'level3'
      if (['level1', 'level2', 'level3', 'level4'].includes(level)) {
        return level as 'level1' | 'level2' | 'level3' | 'level4'
      }
      return 'level3'
    },
    get verifyPatientLink() {
      // Verify that token's smart_patient matches Person.link[]. Default true.
      return process.env.IAL_VERIFY_PATIENT_LINK !== 'false'
    },
    get allowOnPersonLookupFailure() {
      // Whether to allow access if Person lookup fails. Default false (deny).
      return process.env.IAL_ALLOW_ON_PERSON_LOOKUP_FAILURE === 'true'
    },
    get cacheTtl() {
      // Cache TTL for Person resources (5 minutes default)
      return parseInt(process.env.IAL_CACHE_TTL || '300000', 10)
    }
  },

  accessControl: {
    // SMART scope enforcement — validates token scopes against requested FHIR resources
    get scopeEnforcement(): 'enforce' | 'audit-only' | 'disabled' {
      const mode = process.env.SCOPE_ENFORCEMENT_MODE || 'enforce'
      if (mode === 'enforce' || mode === 'audit-only' || mode === 'disabled') return mode
      return 'enforce'
    },
    // Role-based filtering using fhirUser claim (e.g. generalPractitioner-based isolation)
    get roleBasedFiltering(): 'enforce' | 'audit-only' | 'disabled' {
      const mode = process.env.ROLE_BASED_FILTERING_MODE || 'enforce'
      if (mode === 'enforce' || mode === 'audit-only' || mode === 'disabled') return mode
      return 'enforce'
    },
    // Clinical resource types subject to patient-scoped filtering
    get patientScopedResources(): string[] {
      const defaults = ['Observation', 'Condition', 'Procedure', 'MedicationRequest', 'MedicationStatement', 'DiagnosticReport', 'Encounter', 'AllergyIntolerance', 'ImagingStudy', 'CarePlan', 'Consent']
      const env = process.env.PATIENT_SCOPED_RESOURCES?.split(',').map(s => s.trim()).filter(Boolean)
      return env && env.length > 0 ? env : defaults
    },
    // External resource servers allowed as aud/resource in authorize requests.
    // Entries starting with '.' match all subdomains (e.g. '.maxhealth.tech').
    get externalAudiences(): string[] {
      return (process.env.ALLOWED_EXTERNAL_AUDIENCES || '').split(',').map(s => s.trim()).filter(Boolean)
    },
  },

  kisi: {
    // Kisi Access Control integration
    get apiKey() {
      return process.env.KISI_API_KEY || null
    },
    get baseUrl() {
      return process.env.KISI_BASE_URL || 'https://api.kisi.io'
    },
    get timeout() {
      return Number.parseInt(process.env.KISI_TIMEOUT_MS || '10000', 10)
    },
    get isConfigured() {
      return !!this.apiKey
    },
  },

  unifiAccess: {
    // UniFi Access local controller integration
    get host() {
      return process.env.UNIFI_ACCESS_HOST || null
    },
    get username() {
      return process.env.UNIFI_ACCESS_USERNAME || null
    },
    get password() {
      return process.env.UNIFI_ACCESS_PASSWORD || null
    },
    get isConfigured() {
      return !!(this.host && this.username && this.password)
    },
  },

  mcp: {
    // MCP endpoint configuration — exposes backend tools as a Streamable HTTP MCP server
    // Enabled by default. Override with MCP_ENDPOINT_ENABLED=false to disable.
    get enabled(): boolean {
      const explicit = process.env.MCP_ENDPOINT_ENABLED
      if (explicit !== undefined) return explicit === 'true'
      return true
    },
    get path() {
      return process.env.MCP_ENDPOINT_PATH || '/mcp'
    },
  },

  dicomweb: {
    // DICOMweb proxy configuration — proxies WADO-RS / QIDO-RS requests to a PACS
    get enabled() {
      return !!this.baseUrl
    },
    get baseUrl() {
      return process.env.DICOMWEB_BASE_URL || null // e.g. http://orthanc:8042/dicom-web
    },
    get wadoRoot() {
      return process.env.DICOMWEB_WADO_ROOT || this.baseUrl // WADO-RS root, defaults to baseUrl
    },
    get qidoRoot() {
      return process.env.DICOMWEB_QIDO_ROOT || this.baseUrl // QIDO-RS root, defaults to baseUrl
    },
    // Optional auth for upstream PACS (e.g. Basic auth for Orthanc)
    // Supports explicit DICOMWEB_UPSTREAM_AUTH header, or auto-builds from DICOMWEB_USERNAME/PASSWORD
    get upstreamAuth() {
      if (process.env.DICOMWEB_UPSTREAM_AUTH) return process.env.DICOMWEB_UPSTREAM_AUTH
      const username = process.env.DICOMWEB_USERNAME
      const password = process.env.DICOMWEB_PASSWORD
      if (username && password) {
        return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
      }
      return null
    },
    get timeoutMs() {
      return Number.parseInt(process.env.DICOMWEB_TIMEOUT_MS || '30000', 10)
    },
  },

  urlShortener: {
    get baseUrl() {
      return process.env.URL_SHORTENER_BASE || 'https://go.maxhealth.tech'
    },
    get enabled() {
      return process.env.URL_SHORTENER_ENABLED !== 'false'
    },
  },

  cors: {
    // Support multiple origins - can be a single URL or comma-separated list
    // Defaults to common development origins
    get origins() {
      const defaultOrigins = [
        'http://localhost:5173', // Vite dev server (admin UI)
        'http://localhost:5174', // Vite dev server (consent app)
        'http://localhost:5175', // Vite dev server (DTR app)
        'http://localhost:5176', // Vite dev server (patient picker)
        'http://localhost:3000', // React dev server  
        'http://localhost:4567', // Inferno SMART compliance test runner
        'http://localhost:8445', // App server
        config.baseUrl // Fallback to base URL
      ];
      
      const envOrigins = process.env.CORS_ORIGINS?.split(',').map(s => s.trim()) || [];
      
      // In production with explicit CORS_ORIGINS, use only those
      if (process.env.NODE_ENV === 'production' && envOrigins.length > 0) {
        return envOrigins;
      }
      
      // Otherwise include all default + env origins
      const allOrigins = [...new Set([...defaultOrigins, ...envOrigins])];
      return allOrigins.filter(Boolean);
    }
  }
} as const
