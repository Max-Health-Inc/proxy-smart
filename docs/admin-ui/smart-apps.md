# SMART Apps

Register and manage SMART on FHIR OAuth clients. Each SMART app corresponds to a Keycloak client with SMART-specific attributes.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/smart-apps/` | List all registered SMART apps |
| POST | `/admin/smart-apps/` | Register a new SMART app |
| GET | `/admin/smart-apps/:clientId` | Get app details |
| PUT | `/admin/smart-apps/:clientId` | Update app configuration |
| DELETE | `/admin/smart-apps/:clientId` | Remove app registration |

## App Registration

When creating a SMART app, you provide:

- **Client ID** -- unique identifier used in OAuth flows
- **App Name** -- human-readable display name
- **Redirect URIs** -- allowed OAuth callback URLs
- **Launch URI** -- the URL opened when the app is launched from an EHR context
- **Client Type** -- `public` (SPA, native) or `confidential` (backend service)
- **Grant Types** -- `authorization_code`, `client_credentials`, etc.
- **Scopes** -- which SMART scopes the app is allowed to request

## Launch Types

| Type | Flow | Use Case |
|------|------|----------|
| EHR Launch | `ehr-launch` | App launched from within EHR context (patient already selected) |
| Standalone Launch | `standalone-launch` | App launches independently and selects its own context |
| Backend Service | `client_credentials` | Server-to-server with no user interaction |

## Client Configuration

The backend stores the full Keycloak client configuration and adds SMART-specific metadata:

- **PKCE enforcement** -- required for public clients per SMART STU2
- **Token lifetimes** -- access token and refresh token expiry
- **Allowed scopes** -- restrict which scopes the app can request
- **Web origins** -- CORS origins for browser-based apps
- **Logo URI** -- displayed in consent screens and app store

## Sub-Tabs

The SMART Apps page contains three sub-tabs.

### Registered Apps

The main view for managing manually registered SMART client applications, documented above.

### App Store

Publication and visibility are separate actions, which is what lets an app be pulled from view without losing its catalog entry:

| Action | Description |
|---|---|
| **Publish** | Make an app available in the app store catalog |
| **Unpublish** | Remove an app from the catalog |
| **Hide** | Hide an app from the catalog without removing it |
| **Show** | Restore visibility of a hidden app |

API endpoints: `GET /admin/app-store/`, `POST /admin/app-store/publish`, `POST /admin/app-store/:appId/hide`, `POST /admin/app-store/:appId/show`, `POST /admin/app-store/:appId/unpublish`.

### Dynamic Client Registration

Manages the RFC 7591 Dynamic Client Registration policy: which requirements and defaults apply to clients that register themselves rather than being entered here by an administrator. The policy can be viewed, updated, or reset to its factory defaults.

API endpoints: `GET /admin/client-registration/settings`, `PUT /admin/client-registration/settings`, `POST /admin/client-registration/reset-defaults`.

## Related

- [Scope Management](./scope-management.md) -- configure which scopes exist
- [Launch Contexts](./launch-context.md) -- set per-user launch context attributes
- [FHIR Servers](./fhir-servers.md) -- the upstream servers apps will access

