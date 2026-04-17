# Identity Providers

The Identity Providers page manages external authentication sources (SAML, OIDC, social logins) integrated through Keycloak. This enables federated login so users can authenticate with their existing institutional credentials.

## Accessing

Navigate to **Identity Providers** in the admin sidebar.

## Features

### Provider List

The main view shows all configured identity providers with:
- Provider alias and display name
- Provider type (SAML, OIDC, Google, Microsoft, etc.)
- Enabled/disabled status
- Provider count summary (enabled vs total)

### Adding a Provider

Click **Add Identity Provider** to configure a new external authentication source:

| Field | Description |
|---|---|
| **Alias** | Unique identifier for the provider (used in URLs) |
| **Display Name** | User-facing name shown on the login page |
| **Provider Type** | Protocol — `saml`, `oidc`, `google`, `microsoft`, etc. |
| **Enabled** | Whether the provider is active |
| **Trust Email** | Trust email addresses from this provider without verification |
| **Store Token** | Store the external token for later use |
| **Link Only** | Only link accounts, don't create new users |
| **Hide on Login** | Hide from the login page (for programmatic linking only) |
| **First Broker Login Flow** | Authentication flow for first-time federated users |
| **Post Broker Login Flow** | Authentication flow after broker login |

### Provider Configuration

Each provider type has specific configuration fields in the `config` object:

#### OIDC Providers
- Authorization URL, Token URL, Logout URL
- Client ID and Client Secret
- Scopes, PKCE method
- Issuer, JWKS URL

#### SAML Providers
- SSO Service URL, Entity ID
- Signing and encryption certificates
- NameID format, binding type

### Connection Testing

Test the connection to an identity provider to verify configuration without affecting production logins.

### Editing and Deleting

- Click a provider to edit its configuration
- Delete removes the provider and breaks any linked user accounts

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/idps/count` | Count enabled and total providers |
| `GET` | `/admin/idps/` | List all identity providers |
| `POST` | `/admin/idps/` | Create a new identity provider |
| `GET` | `/admin/idps/:alias` | Get provider details |
| `PUT` | `/admin/idps/:alias` | Update provider configuration |
| `DELETE` | `/admin/idps/:alias` | Delete a provider |

## Common Use Cases

- **Enterprise SSO** — Connect to hospital Active Directory via SAML or OIDC
- **Social Login** — Allow patients to sign in with Google or Apple accounts
- **Multi-organization** — Different identity providers per organization for federated access
- **Identity Brokering** — Chain multiple providers through Keycloak's brokering flows
