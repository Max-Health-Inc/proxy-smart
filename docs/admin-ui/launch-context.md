# Launch Context

Launch Context management configures SMART App Launch context parameters per user. These values are injected into access tokens as claims, enabling SMART apps to receive patient, encounter, and other context on launch.

## Accessing

Navigate to **SMART Config** in the admin sidebar, then select the **Launch Context** tab. The tab has three nested views:

## Context Overview

Displays all users who have launch context attributes configured, showing:
- Username and user ID
- Assigned fhirUser reference
- Patient and encounter in context
- Additional context (intent, tenant, fhirContext)

## Template Library

Pre-built launch context templates for common clinical workflows:
- **EHR Launch with Patient** — sets patient context for EHR-launched apps
- **Standalone Patient Access** — configures patient self-access context
- **Practitioner with Encounter** — sets both patient and encounter context
- Custom templates for specific workflow needs

## User Contexts

Configure launch context attributes for individual users:

### Core SMART Context Attributes

| Attribute | Token Claim | Description |
|---|---|---|
| **fhirUser** | `fhirUser` | FHIR resource representing the user (e.g., `Practitioner/123`, `Patient/456`) |
| **Patient** | `smart_patient` | Patient ID in context for patient-scoped launches |
| **Encounter** | `smart_encounter` | Encounter ID in context |
| **fhirContext** | `smart_fhir_context` | Array of FHIR resource references providing additional context |

### Extended Attributes

| Attribute | Token Claim | Description |
|---|---|---|
| **Intent** | `smart_intent` | Workflow intent string (e.g., `reconcile-medications`, `order-sign`) |
| **Need Patient Banner** | `smart_need_patient_banner` | Whether the app should display a patient identification banner |
| **Style URL** | `smart_style_url` | URL to CSS stylesheet for app branding |
| **Tenant** | `smart_tenant` | Tenant identifier for multi-tenant deployments |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/launch-contexts/` | List all users with launch context |
| `POST` | `/admin/launch-contexts/:userId/fhir-user/:fhirUserId` | Set fhirUser for a user |
| `POST` | `/admin/launch-contexts/:userId/patient/:patientId` | Set patient context |
| `POST` | `/admin/launch-contexts/:userId/encounter/:encounterId` | Set encounter context |
| `POST` | `/admin/launch-contexts/:userId/fhir-context` | Set fhirContext array |
| `DELETE` | `/admin/launch-contexts/:userId/fhir-user` | Remove fhirUser |
| `DELETE` | `/admin/launch-contexts/:userId/patient` | Remove patient context |
| `DELETE` | `/admin/launch-contexts/:userId/encounter` | Remove encounter context |
| `DELETE` | `/admin/launch-contexts/:userId/fhir-context` | Remove fhirContext |
| `PUT` | `/admin/launch-contexts/:userId/intent` | Set intent |
| `PUT` | `/admin/launch-contexts/:userId/need-patient-banner` | Set need_patient_banner |
| `PUT` | `/admin/launch-contexts/:userId/smart-style-url` | Set style URL |
| `PUT` | `/admin/launch-contexts/:userId/tenant` | Set tenant |
| `DELETE` | `/admin/launch-contexts/:userId/intent` | Remove intent |
| `DELETE` | `/admin/launch-contexts/:userId/need-patient-banner` | Remove need_patient_banner |
| `DELETE` | `/admin/launch-contexts/:userId/smart-style-url` | Remove style URL |
| `DELETE` | `/admin/launch-contexts/:userId/tenant` | Remove tenant |

## How It Works

Launch context values are stored as Keycloak user attributes. When a user authenticates and receives a token, Keycloak's SMART scope mappers read these attributes and inject them as token claims. SMART apps then receive these claims in the token response or via introspection.

For example, setting `patient=Patient/123` for a user means any SMART app launched with `launch/patient` scope will receive `"patient": "Patient/123"` in the token response.

See [Scope Management](scope-management) for configuring the SMART scope mappers that read these attributes.
