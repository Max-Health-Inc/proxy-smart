# Scope Management

Manage SMART on FHIR client scopes in Keycloak. Scopes define what FHIR resources and operations an application is allowed to request access to.

## SMART Scope Format

Scopes follow the SMART v2 pattern:

```
{context}/{resource}.{interaction}[?param=value]
```

| Context | Meaning |
|---------|---------|
| `patient/` | Data where the in-context patient is the subject |
| `user/` | Data accessible to the authenticated user |
| `system/` | Backend service access (no user session) |

Interactions: `read`, `write`, `cruds` (create + read + update + delete + search).

Examples: `patient/Observation.read`, `user/Patient.cruds`, `system/Bundle.read`.

## API Endpoints -- Client Scopes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/smart-scopes/` | List scopes (`?smartOnly=true` to filter) |
| POST | `/admin/smart-scopes/` | Create a single scope |
| POST | `/admin/smart-scopes/batch` | Batch-create scopes (idempotent) |
| DELETE | `/admin/smart-scopes/:scopeId` | Delete a scope |

### Batch Create

The batch endpoint accepts an array of scope names and creates any that don't already exist. This is the recommended way to provision a full set of SMART scopes for a new deployment.

```json
{
  "scopes": [
    "patient/Patient.read",
    "patient/Observation.read",
    "user/Patient.cruds",
    "launch/patient",
    "openid",
    "fhirUser"
  ]
}
```

## API Endpoints -- Protocol Mappers

Protocol mappers ensure that granted scopes appear correctly in access tokens. The scope-mappers endpoints check health and auto-fix missing mappers.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/scope-mappers/` | Check SMART mapper health status |
| POST | `/admin/scope-mappers/fix` | Auto-provision missing mappers |
| DELETE | `/admin/scope-mappers/:scopeId/:mapperId` | Delete a specific mapper |

### Mapper Health

`GET /admin/scope-mappers/` returns a status report indicating which scopes are missing their required protocol mappers. If any are missing, call `POST /admin/scope-mappers/fix` to auto-provision them.

## Common Scopes

These scopes are typically needed for SMART STU2 compliance:

| Scope | Purpose |
|-------|---------|
| `openid` | OpenID Connect identity |
| `fhirUser` | Include `fhirUser` claim in ID token |
| `launch/patient` | Request patient context in standalone launch |
| `launch/encounter` | Request encounter context |
| `offline_access` | Enable refresh tokens |
| `patient/Patient.read` | Read patient demographics |
| `patient/Observation.read` | Read clinical observations |
| `user/Patient.read` | Practitioner access to patients |

## Admin UI Sub-Tabs

The **SMART Config** page in the admin UI contains three sub-tabs:

- **Scopes** -- scope CRUD (documented above)
- **Launch Context** -- per-user SMART launch context management; see [Launch Contexts](./launch-contexts.md)
- **Protocol Mappers** -- diagnostic view showing mapper health + one-click fix via `POST /admin/scope-mappers/fix`

## Related

- [SMART Apps](./smart-apps.md) -- assign allowed scopes to app registrations
- [User Management](./user-management.md) -- users whose tokens carry these scopes

