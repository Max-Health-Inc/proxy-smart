# FHIR Proxy

The FHIR proxy is the core component of Proxy Smart. It sits between SMART apps and upstream FHIR servers, providing authentication, authorization, consent enforcement, and capability-aware request normalization.

## Route Structure

All proxied FHIR requests follow this URL pattern:

```
{BASE_URL}/{app-name}/{server_name}/{fhir_version}/{resource_path}
```

For example:
```
https://proxy.example.com/proxy-smart/hapi-fhir/R4/Patient/123
```

| Segment | Description |
|---|---|
| `server_name` | Identifier of a configured FHIR server (see [FHIR Servers](admin-ui/fhir-servers)) |
| `fhir_version` | FHIR version — `R4`, `R5`, etc. (configured via `FHIR_SUPPORTED_VERSIONS`) |
| `resource_path` | Standard FHIR path — `Patient/123`, `Observation?patient=123`, etc. |

## Request Pipeline

Every proxied request passes through a five-stage pipeline:

### 1. Authentication

All requests (except `GET /metadata`) require a valid Bearer token. The token is validated against Keycloak's JWKS endpoint. If validation fails, the proxy returns `401`.

### 2. Consent & IAL Enforcement

When consent enforcement is enabled (`CONSENT_MODE=enforce`), the proxy checks whether the token holder has consent to access the requested resource.

- The consent service evaluates the request against FHIR Consent resources
- Identity Assurance Level (IAL) checks verify the trust level of the Person→Patient link
- If consent is denied, the proxy returns `403` with details:
  - `consent_denied` — no active consent for this access
  - `ial_verification_failed` — identity assurance level insufficient

Consent enforcement has three modes:
| Mode | Behavior |
|---|---|
| `disabled` | No consent checks (default) |
| `audit-only` | Checks consent and logs decisions, but never blocks requests |
| `enforce` | Blocks requests without valid consent |

### 3. SMART Scope Enforcement

When enabled (`SCOPE_ENFORCEMENT_MODE=enforce`), validates that the token's scopes grant permission for the requested operation.

- Supports SMART v1 format (`patient/Observation.read`) and v2 format (`patient/Observation.cruds`)
- Validates resource type and HTTP method against granted scopes
- Wildcard scopes (`patient/*.read`) match any resource type
- Returns `403` if the requested operation exceeds granted scopes

### 4. Role-Based Data Isolation

When enabled (`ROLE_BASED_FILTERING_MODE=enforce`), restricts data visibility based on the `fhirUser` token claim.

- **Patient users** — can only access their own data; the proxy injects `patient={id}` search parameters
- **Practitioner users** — see only patients assigned to them via `generalPractitioner` references; the proxy looks up assigned patients and injects compartment filters
- If a practitioner has no assigned patients, the proxy returns an empty Bundle rather than leaking data

### 5. Capability-Aware Normalization

The proxy fetches and caches each upstream server's `CapabilityStatement` to enable intelligent request handling.

#### Strict Mode (per-server opt-in)

When `strictCapabilities` is enabled on a FHIR server:

- **Interaction checks** — rejects unsupported CRUD operations with `405`
- **History checks** — rejects `_history` requests if the server doesn't declare history support
- **Operation checks** — rejects `$operation` calls not declared in the CapabilityStatement
- **PATCH format checks** — rejects PATCH with unsupported content types with `415`

#### Search Parameter Normalization (always active)

Regardless of strict mode, the proxy strips search parameters and `_include`/`_revinclude` values not declared by the upstream server. This prevents `400` errors from servers that reject unknown parameters. Stripped parameters are listed in the `x-proxy-stripped-params` response header.

## URL Rewriting

Response bodies are rewritten so that all FHIR resource URLs point back through the proxy rather than directly at the upstream server. This ensures clients always route through the proxy's access control pipeline.

## mTLS Support

Each FHIR server can be configured with mutual TLS (mTLS) certificates for upstream connections. When enabled, the proxy presents a client certificate when connecting to that server. See [FHIR Servers](admin-ui/fhir-servers) for configuration.

## SMART Configuration

Each FHIR server exposes a `/.well-known/smart-configuration` endpoint through the proxy, dynamically generated from Keycloak's OIDC configuration and cached for performance.

## Monitoring

All proxied requests are tracked with metrics including server name, HTTP method, resource type, status code, response time, and client ID. These metrics are available via the [Monitoring](admin-ui/monitoring) dashboard.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `FHIR_SERVER_BASE` | Comma-separated upstream FHIR server URLs | `http://localhost:8081/fhir` |
| `FHIR_SUPPORTED_VERSIONS` | Comma-separated FHIR versions | `R4` |
| `CONSENT_MODE` | Consent enforcement mode: `disabled`, `audit-only`, `enforce` | `disabled` |
| `CONSENT_ENABLED` | Enable consent checks | `false` |
| `CONSENT_CACHE_TTL` | Consent decision cache TTL (ms) | `60000` |
| `CONSENT_EXEMPT_CLIENTS` | Comma-separated client IDs exempt from consent | — |
| `CONSENT_REQUIRED_RESOURCE_TYPES` | Resource types that always require consent | — |
| `CONSENT_EXEMPT_RESOURCE_TYPES` | Resource types exempt from consent | `CapabilityStatement,metadata` |
| `IAL_ENABLED` | Enable Identity Assurance Level checks | `false` |
| `IAL_MINIMUM_LEVEL` | Minimum IAL for general access | `level1` |
| `IAL_SENSITIVE_RESOURCE_TYPES` | Resource types requiring elevated IAL | — |
| `IAL_SENSITIVE_MINIMUM_LEVEL` | Minimum IAL for sensitive resources | `level3` |
| `IAL_VERIFY_PATIENT_LINK` | Verify token patient matches Person.link[] | `true` |
| `IAL_ALLOW_ON_PERSON_LOOKUP_FAILURE` | Allow access if Person lookup fails | `false` |
| `IAL_CACHE_TTL` | Person resource cache TTL (ms) | `300000` |
| `SCOPE_ENFORCEMENT_MODE` | Scope enforcement: `disabled`, `audit-only`, `enforce` | `disabled` |
| `ROLE_BASED_FILTERING_MODE` | Role-based filtering: `disabled`, `audit-only`, `enforce` | `disabled` |
| `PATIENT_SCOPED_RESOURCES` | Resource types subject to patient-scoped filtering | `Observation,Condition,...` |
| `SMART_CONFIG_CACHE_TTL` | SMART configuration cache TTL (ms) | `300000` |
