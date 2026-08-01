---
name: smart-launch-debugging
description: >-
  Work out why a SMART on FHIR launch, token, or FHIR request failed against a Proxy Smart
  deployment. Use when an app cannot log in, the token is rejected, launch context (patient,
  encounter, fhirUser) is missing, a FHIR call returns 401 or 403, token exchange fails with
  invalid_target, or a scope the app asked for is not in the granted set. Uses the
  `proxy-smart` MCP server to read the deployment's actual client and scope configuration.
---

# Debugging a failed launch

Almost every report arrives as "the app does not work". The first job is to find out which of
four stages it stopped at, because each has a different set of causes and there is no point
reading scope configuration for a failure that happened before the authorize request.

## Locate the stage first

| Stage | What the operator sees | Where to look |
| --- | --- | --- |
| Authorize | Never reaches the login page, or an error page instead of a redirect back | Client registration: redirect URIs, flow flags, PKCE |
| Login | Login page appears, then access is denied | `requiredRoles`, `allowedFhirUserTypes`, organization membership |
| Token | Redirect back happens, token request fails | Auth method, PKCE verifier, `invalid_target` |
| FHIR call | Token issued, requests to FHIR return 401 or 403 | Audience, granted scopes, server access, consent |

Ask what the app got, verbatim: the error code, the redirect URL it landed on, and the response
body. An OAuth error code narrows this in one step, and a paraphrase usually does not.

Then read the client back from the deployment before theorizing. What the app's own
documentation says it was configured with and what the client actually holds diverge often
enough that checking first is cheaper than reasoning from the wrong premise.

## Authorize stage

**Redirect URI mismatch** is the most common single cause, and it is exact-match: the
trailing slash, the port, and http vs https all count. Compare the URI the app sent with
`redirectUris` character by character rather than by eye.

**Flow flags.** An authorization-code app needs `standardFlowEnabled`. A backend service does
not use this stage at all, so a backend service failing here means the app is using the wrong
flow for its type.

**PKCE.** A public client with `requirePkce` and an app that sends no `code_challenge` fails
here. The fix is in the app; loosening `requirePkce` on a public client is not a fix.

**CORS.** A browser app whose origin is not in `webOrigins` fails in the browser with no useful
server-side error. If the network tab shows a blocked request rather than an OAuth error,
start here.

## Login stage

The user authenticated and was then refused. This deployment denies at login rather than at
the first FHIR call, which is why it looks like a login problem.

- `requiredRoles` — the user lacks a realm role the app demands. Check the user's roles, not
  just the app's requirement.
- `allowedFhirUserTypes` — a Patient signing in to a Practitioner-only app, or the reverse.
- `organizationIds` — on a multi-tenant deployment, the user is not a member of an
  organization the app is assigned to.

For each, the question to settle is whether the restriction is wrong or the user is. Adding a
role to make one login work is the change most likely to be regretted later; if the app really
is for that user, the membership or role assignment is the thing that is missing.

## Token stage

**`invalid_target`** means the RFC 8707 resource indicator could not be bound. Every SMART
launch through this proxy forwards the session audience as a `resource` parameter, and that
only resolves if the client carries the `resource-indicators` default client scope. The backend
attaches it to every client it provisions, through both DCR and the admin API, so seeing this
means either the client was created directly in Keycloak, bypassing the proxy, or the
`resource-indicators` scope is absent from the realm because the deployment was not reconciled.
Check the realm has the scope before touching the client.

**Client authentication failures** come from a `tokenEndpointAuthMethod` the app is not using:
a secret sent as a POST body to a client configured for Basic, or a rotated secret the app
still holds. For `private_key_jwt`, confirm the JWKS the deployment reads is reachable and
contains the key the app signed with.

**Missing scopes in the response.** Compare the granted scopes with the requested ones. A scope
the client does not have assigned is dropped silently rather than refused, so the token is
issued and the app fails later against FHIR. This is worth checking here even when the token
request looked like it succeeded.

## FHIR call stage

**401 with an audience complaint.** Token validation is fail-closed on the audience claim: a
token whose `aud` does not name this resource is rejected even when it is otherwise perfectly
valid and freshly issued. If the app calls something downstream, the downstream client belongs
in `audienceClients` so the audience mapper exists. On a deployment configured out of band,
absent audience mappers break every token at once rather than one app's, which is the
signature to look for.

**403 `insufficient_scope`.** The token is valid and does not carry the scope for the resource
type or the operation. Read the granted scopes rather than the requested ones.

**403 `access_denied`.** Access control refused the specific resource: usually a patient-scoped
token reaching a record that is not the user's own. This is the control working, so before
changing anything, establish whether the app should have been asking for that record at all.

**403 `tenant_access_denied`.** The resource belongs to another organization. Check the user's
and the app's organization membership rather than the scopes.

**Missing patient, encounter, or fhirUser.** Launch context is held per token and applied when
the token is introspected. Missing context on an `ehr-launch` app usually means the `launch`
scope was never granted, so there was no context to store. A `fhirUser` pointing at the wrong
resource type is the `patientFacing` flag: true resolves to Patient through Person links, false
to Practitioner, and undefined passes the raw value through.

**Server access.** A 403 on one FHIR server while another works is `serverAccessType` and
`allowedServerIds`, not scopes.

## Before you close it

Confirm the fix against the deployment, not against the change you made: re-read the client and
have the app retry. Say plainly which stage it was failing at and what was actually wrong,
because the same app will be onboarded again elsewhere. If the cause was a deployment-wide
configuration gap rather than this one app — a missing realm scope, absent audience mappers —
say so, since every other client has the same problem and has not reported it yet.

## Reference

- [Launch context](https://github.com/Max-Health-Inc/proxy-smart/blob/main/docs/admin-ui/launch-context.md)
  — how patient, encounter, and fhirUser are carried
- [Access control](https://github.com/Max-Health-Inc/proxy-smart/blob/main/docs/admin-ui/access-control.md)
  and [Scope management](https://github.com/Max-Health-Inc/proxy-smart/blob/main/docs/admin-ui/scope-management.md)
- [OAuth authentication](https://github.com/Max-Health-Inc/proxy-smart/blob/main/docs/oauth-authentication.md)
  and [FHIR proxy](https://github.com/Max-Health-Inc/proxy-smart/blob/main/docs/fhir-proxy.md)
