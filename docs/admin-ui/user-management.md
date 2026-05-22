# Healthcare Users

Manage Keycloak users that participate in SMART on FHIR flows. Users created here get Keycloak accounts and can optionally be linked to FHIR Person/Practitioner resources and external identity providers.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/healthcare-users/` | List users (paginated, searchable) |
| POST | `/admin/healthcare-users/` | Create a new user |
| GET | `/admin/healthcare-users/:userId` | Get user details |
| PUT | `/admin/healthcare-users/:userId` | Update user |
| DELETE | `/admin/healthcare-users/:userId` | Delete user |
| GET | `/admin/healthcare-users/:userId/federated-identities` | List linked IdPs |
| POST | `/admin/healthcare-users/:userId/federated-identities/:provider` | Link external IdP |
| DELETE | `/admin/healthcare-users/:userId/federated-identities/:provider` | Unlink external IdP |

## Creating a User

Required fields:

- **Username** — Keycloak login name
- **First name / Last name**
- **Email** — used for password resets and notifications
- **Enabled** — whether the account is active immediately
- **Credentials** — initial password (can be marked temporary)

Optional fields:

- **Attributes** — key-value pairs stored on the Keycloak user (e.g., `fhirUser`, department)
- **Realm roles** — assign roles like `clinician`, `admin`, etc.
- **Groups** — Keycloak group membership

## Federated Identity Links

A user can be linked to external identity providers (SAML, OIDC, LDAP). This allows them to log in via those providers while maintaining a single Keycloak identity.

Use the federated-identities endpoints to:
- List which providers a user is linked to
- Link a new provider (requires the external user ID and username)
- Unlink a provider

## Launch Contexts

Per-user SMART launch context is managed via the [Launch Contexts](./launch-contexts.md) API. This controls what `patient`, `encounter`, `fhirUser`, and other context values are injected into tokens for that user.

## Roles

Roles are managed separately via `/admin/roles/`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/roles/` | List all realm roles |
| POST | `/admin/roles/` | Create role |
| GET | `/admin/roles/:roleName` | Get role details |
| PUT | `/admin/roles/:roleName` | Update role |
| DELETE | `/admin/roles/:roleName` | Delete role |
| GET | `/admin/roles/clients/:clientId` | List client-specific roles |

## Organizations

Users can be members of organizations (Keycloak Organizations feature):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/organizations/` | List organizations |
| POST | `/admin/organizations/` | Create organization |
| GET | `/admin/organizations/:orgId/members` | List members |
| POST | `/admin/organizations/:orgId/members` | Add member |
| DELETE | `/admin/organizations/:orgId/members/:userId` | Remove member |

Organizations support per-org branding overrides via the `/:orgId/branding` endpoints.

## Related

- [Identity Providers](./identity-providers.md) — configure the external IdPs users can link to
- [Scope Management](./scope-management.md) — what scopes apps can request on behalf of users
- [Launch Contexts](./launch-contexts.md) — per-user SMART context attributes
- **Anonymization**: Privacy-preserving analytics

## 🛠️ Integration Capabilities

### External Systems
- **LDAP/AD Integration**: Directory service synchronization
- **SAML/OIDC**: Federated identity management
- **HR Systems**: Employee database integration
- **Badge Systems**: Physical access correlation

### API Access
- **REST API**: Programmatic user management
- **Webhooks**: Real-time user event notifications
- **Bulk Operations**: API-based mass user updates
- **Synchronization**: Two-way data sync capabilities

## 📱 Mobile Support

### Mobile-Optimized Interface
- **Responsive Design**: Optimized for all screen sizes
- **Touch-Friendly**: Mobile-first interaction design
- **Offline Capability**: Limited offline functionality
- **Push Notifications**: Mobile alert delivery

## 🎯 Best Practices

### User Onboarding
1. **Pre-registration**: Collect requirements before account creation
2. **Role Assignment**: Assign minimal necessary permissions initially
3. **Training**: Provide platform orientation and training
4. **Gradual Access**: Incrementally increase permissions as needed

### Ongoing Management
1. **Regular Reviews**: Periodic access certification
2. **Activity Monitoring**: Watch for unusual usage patterns
3. **Feedback Collection**: User experience improvement
4. **Documentation**: Maintain up-to-date user procedures

### Security Hygiene
1. **Password Policies**: Enforce strong authentication
2. **Session Management**: Monitor and control active sessions
3. **Permission Cleanup**: Remove unnecessary access regularly
4. **Incident Response**: Have procedures for security events

The User Management system provides the foundation for secure, compliant, and efficient healthcare user administration within the SMART on FHIR ecosystem.

## User Federation (LDAP)

The Users page includes a **User Federation** sub-tab for managing LDAP directory connections. This allows importing and synchronizing users from enterprise directories (Active Directory, OpenLDAP, etc.) into Keycloak.

See the dedicated [User Federation](user-federation) page for full documentation on LDAP provider configuration, sync operations, and attribute mapping.
