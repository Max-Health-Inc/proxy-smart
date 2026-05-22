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

## API Endpoints — Client Scopes

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

## API Endpoints — Protocol Mappers

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

## Related

- [SMART Apps](./smart-apps.md) — assign allowed scopes to app registrations
- [User Management](./user-management.md) — users whose tokens carry these scopes
- **📋 Requirements**: Minimum permission validation
- **🛡️ Security**: Security policy compliance

## 🔍 Troubleshooting

### Common Scope Issues

#### Permission Conflicts
- **🚨 Overlapping Scopes**: Conflicting permission combinations
- **❌ Insufficient Access**: Missing required permissions
- **🔒 Over-Privileged**: Excessive permission grants
- **🎯 Misaligned Context**: Incorrect context prefix usage

#### Application Integration
- **📱 App Registration**: Application scope configuration
- **🔐 OAuth Flow**: Authorization scope handling
- **🎯 Launch Context**: Context-scope alignment
- **📊 Resource Access**: FHIR resource accessibility

### Diagnostic Tools

#### Scope Validators
- **✅ Syntax Check**: Scope syntax validation
- **🔍 Compatibility**: FHIR version compatibility
- **📋 Standards**: SMART specification compliance
- **🛡️ Security**: Security best practice validation

#### Access Simulators
- **🧪 User Simulation**: Simulate user access scenarios
- **📱 App Testing**: Test application access patterns
- **🎯 Context Testing**: Launch context simulation
- **📊 Permission Testing**: Effective permission verification

## 📈 Best Practices

### Scope Design Principles
1. **🎯 Least Privilege**: Grant minimum necessary permissions
2. **🔒 Defense in Depth**: Multiple permission layers
3. **📋 Clear Documentation**: Document scope purposes
4. **🧪 Regular Testing**: Validate scope effectiveness

### Template Management
1. **🎯 Role Alignment**: Align templates with job functions
2. **🔄 Regular Review**: Periodic template review and updates
3. **📊 Usage Monitoring**: Track template utilization
4. **🛡️ Security Focus**: Prioritize security in template design

### Compliance Management
1. **📋 Documentation**: Maintain comprehensive documentation
2. **🔍 Regular Audits**: Conduct permission audits
3. **📊 Reporting**: Generate compliance reports
4. **🔄 Continuous Improvement**: Iteratively improve processes

The Scope Management system provides the foundation for secure, compliant, and efficient data access control within the SMART on FHIR healthcare ecosystem.

## Related Sub-Tabs

The **SMART Config** page in the admin UI contains three sub-tabs:

- **Scopes** — Scope configuration (documented above)
- **Launch Context** — Per-user SMART launch context management. See the dedicated [Launch Context](launch-context) page.
- **Protocol Mappers** — Diagnostic view and repair tool for SMART scope protocol mappers in Keycloak. Lists all configured mappers, detects issues, and provides a one-click fix action via `POST /admin/scope-mappers/fix`.

