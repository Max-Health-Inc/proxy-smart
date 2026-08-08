# Identity Providers

The Identity Providers page manages external authentication sources (SAML, OIDC, social logins) integrated through Keycloak. This enables federated login so users can authenticate with their existing institutional credentials.

## Accessing

Navigate to **Identity Providers** in the admin sidebar.

## Provider List

The main view shows each configured provider by alias and display name, with its protocol (SAML, OIDC, Google, Microsoft, and so on) and enabled state, above a count of enabled versus total.

## Adding a Provider

Click **Add Identity Provider** to configure a new external authentication source:

| Field | Description |
|---|---|
| **Alias** | Unique identifier for the provider (used in URLs) |
| **Display Name** | User-facing name shown on the login page |
| **Provider Type** | Protocol -- `saml`, `oidc`, `google`, `microsoft`, etc. |
| **Enabled** | Whether the provider is active |
| **Trust Email** | Trust email addresses from this provider without verification |
| **Store Token** | Store the external token for later use |
| **Link Only** | Only link accounts, don't create new users |
| **Hide on Login** | Hide from the login page (for programmatic linking only) |
| **First Broker Login Flow** | Authentication flow for first-time federated users |
| **Post Broker Login Flow** | Authentication flow after broker login |

## Provider Configuration

The remaining fields live in the provider's `config` object and depend on its protocol. OIDC providers take the authorization, token, and logout URLs, a client ID and secret, the issuer and JWKS URL, and the scopes and PKCE method to request. SAML providers take the SSO service URL and entity ID, the signing and encryption certificates, and the NameID format and binding type.

## Claim Mappers

A user who authenticates through an external IdP arrives in Keycloak with only
the claims a mapper imports for them. That matters for SMART: `fhirUser` is read
from the Keycloak user by the token endpoint, the consent service and the
session resolver, so without an import mapper a brokered user cannot be launched
into a SMART app.

The **Claim Mapping** column shows, per provider, whether the expected imports
are in place. Open **Claim Mappers** from the row menu to:

- See every mapper on the provider as `external claim → user attribute`, with its sync mode
- Provision the expected imports with one action (idempotent -- existing mappers are left alone)
- Add a mapper of any type the provider supports, with the form built from the type's own properties
- Delete a mapper

Expected imports:

| Mapper | Imports | Required |
|---|---|---|
| `fhirUser-import` | `fhirUser` claim → `fhirUser` user attribute | Yes |
| `organization-import` | `organization` claim → `organization` user attribute | No |

Both are provisioned with sync mode `FORCE`, so a change upstream propagates on
the user's next login. Creating a provider through the admin API or the admin UI
provisions them automatically; the action above exists for providers created
elsewhere and for repairing drift.

The mapper type used depends on the provider: Keycloak ships
`oidc-user-attribute-idp-mapper` for OIDC and `saml-user-attribute-idp-mapper`
for SAML, while social providers register their own variants. The proxy asks
Keycloak which types a provider supports and picks the matching one rather than
assuming, so provider types with no attribute mapper at all are reported as
**Not applicable** instead of failing.

Two kinds of provider are exempt from these expectations, both shown as
**Not applicable** rather than unhealthy, because no admin action could ever
make them green:

- Provider types Keycloak offers no claim-to-attribute mapper for.
- Machine trust anchors -- providers configured with `supportsClientAssertions`,
  such as `proxy-smart-signing`. They federate signed client assertions for
  SMART Backend Services, not people, so no user ever logs in through them and
  no user attribute is ever imported. See [Federated JWT](../federated-jwt.md).

## Connection Testing

A provider's connection can be tested from its row, which verifies the configuration without putting a production login at risk.

## Editing and Deleting

Clicking a provider opens its configuration for editing. Deleting one also breaks every user account linked through it, so it is not a reversible cleanup.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/idps/count` | Count enabled and total providers |
| `GET` | `/admin/idps/` | List all identity providers |
| `POST` | `/admin/idps/` | Create a new identity provider |
| `GET` | `/admin/idps/:alias` | Get provider details |
| `PUT` | `/admin/idps/:alias` | Update provider configuration |
| `DELETE` | `/admin/idps/:alias` | Delete a provider |
| `GET` | `/admin/idps/mapper-status` | Claim-mapping status for every provider |
| `GET` | `/admin/idps/:alias/mapper-status` | Claim-mapping status for one provider |
| `GET` | `/admin/idps/:alias/mapper-types` | Mapper types the provider supports, with their properties |
| `GET` | `/admin/idps/:alias/mappers` | List the provider's mappers |
| `POST` | `/admin/idps/:alias/mappers` | Create a mapper |
| `POST` | `/admin/idps/:alias/mappers/fix` | Provision the expected attribute imports (query: `includeOptional=false` for required only) |
| `PUT` | `/admin/idps/:alias/mappers/:mapperId` | Update a mapper (config entries are merged) |
| `DELETE` | `/admin/idps/:alias/mappers/:mapperId` | Delete a mapper |

## Common Use Cases

The usual case is enterprise SSO: a hospital's Active Directory connected over SAML or OIDC so clinicians keep their existing credentials. Patient-facing deployments often add social login through Google or Apple alongside it, and a multi-organization realm can point each organization at its own provider. Keycloak's brokering flows allow chaining several providers where the trust path is indirect.

In every one of these, the `fhirUser` import mapper is what turns a brokered identity into something that can launch a SMART app.
