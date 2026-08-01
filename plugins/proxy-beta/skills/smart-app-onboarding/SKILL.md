---
name: smart-app-onboarding
description: >-
  Register and configure a SMART on FHIR app on a Proxy Smart deployment. Use when someone
  wants to onboard an app, client, or backend service against the proxy, asks which scopes or
  launch type an app needs, wants to restrict an app to certain FHIR servers, users, roles, or
  Keycloak Organizations, or is rotating a client secret or JWKS. Uses the `proxy-smart` MCP
  server, whose tools are generated from the deployment's admin API.
---

# Onboarding a SMART app

Proxy Smart is an authorization proxy: it holds no clinical data, and registering an app means
creating an OAuth client in Keycloak plus the SMART-specific configuration around it. The MCP
server lists the tools and their schemas, so read those rather than guessing field names. What
follows is the part the schemas do not say: which combination of settings is actually correct.

## Ask for four things before creating anything

An app cannot be registered well from a name and a redirect URI. Get these first, because each
one changes several fields at once and changing them afterwards means re-issuing credentials.

1. **How it launches.** `standalone-app` (the user opens it and picks a patient),
   `ehr-launch` (an EHR launches it with patient and encounter context), `backend-service`
   (no user at all, client credentials), or `agent`.
2. **Whether it can keep a secret.** A browser or mobile app cannot; a server-side app can.
   This is `clientType` `public` vs `confidential`, and it decides the authentication method.
3. **What data it needs, at what granularity.** Not "patient records" but the resource types
   and the read/write split. This becomes the scope list.
4. **Which FHIR servers it may reach.** Deployments usually front more than one.

## Field combinations that must agree

These are the ones a mismatch breaks quietly, at first launch rather than at registration.

**Public client.** `clientType: 'public'`, `tokenEndpointAuthMethod: 'none'`, and
`requirePkce: true`. A public client with a secret is a public client whose secret is in a
JavaScript bundle. PKCE is not optional here.

**Confidential client.** `client_secret_basic` or `client_secret_post` with a `secret`, or
`private_key_jwt` with `jwksUri`, `jwksString`, or `publicKey`. Prefer `private_key_jwt` and a
`jwksUri`: the app rotates its own keys and no shared secret ever transits.

**Backend service.** `appType: 'backend-service'` implies `clientType: 'backend-service'` and
sets its own flags — do not also set `publicClient`. Use `systemScopes` (`system/…`), not
`patient/…` or `user/…`, and `private_key_jwt`, which is what SMART Backend Services expects.
There is no redirect URI and no launch context, so anything patient-scoped is a sign the app
type is wrong.

**EHR launch.** Needs the `launch` scope alongside the resource scopes, and a `launchUrl`.
`patient/…` scopes without `launch` produce an app that authorizes and then has no patient.

**Offline access.** `allowOfflineAccess: true` adds refresh tokens. Grant it only to an app
that genuinely runs while the user is away; for a foreground app it turns a session-length
grant into an indefinite one.

## Scopes

Ask for the least that makes the app work, per resource type. `patient/Observation.rs` beats
`patient/*.read`, and a wildcard in a production app is worth one question before you write it.

Two things to know about how the deployment handles them:

- A scope named on an app that does not exist yet is created and assigned as a client scope on
  update. You do not need to pre-create scopes before referencing them, and a typo therefore
  becomes a real, permanently orphaned scope rather than an error. Check the spelling against
  the existing scope list before writing it.
- If several apps share a profile, put it in a **scope set** and reference it by `scopeSetId`
  instead of copying the list. One definition to change when the profile changes.

## Access control beyond scopes

Scopes say what an app may ask for. These say who and what it may reach, and they are the
fields most often left at their defaults when they should not be.

| Field | What it decides |
| --- | --- |
| `serverAccessType` | `all-servers`, `selected-servers` (with `allowedServerIds`), or `user-person-servers` — the servers linked to the user's own Person record |
| `organizationIds` | Which Keycloak Organizations the app belongs to. Empty means every organization, which on a multi-tenant deployment is rarely what anyone wants |
| `allowedFhirUserTypes` | Restricts login to e.g. `Practitioner` or `Patient` |
| `requiredRoles` | Realm roles a user must hold; users without them are denied at login, not at the first FHIR call |
| `patientFacing` | Resolves `fhirUser` to Patient (via Person links) when true, Practitioner when false. Leaving it undefined passes `fhirUser` through unchanged |
| `consentRequired` | Whether the user sees a consent screen for the scopes |
| `fullScopeAllowed` | When true, every realm and client role lands in the token. Set it false unless there is a reason |

`serverAccessType: 'all-servers'` on an app that only ever reads from one server is the most
common over-grant here, and nothing later in the stack will flag it.

## Audience, if the app calls anything downstream

Token validation on this deployment is fail-closed on the audience claim. An app whose token
has to be accepted by another client needs that client in `audienceClients`, which creates the
audience mapper. If it performs RFC 8693 token exchange it also needs `tokenExchangeEnabled`.
Skipping this produces a token that is valid everywhere except where it is used, and the
failure surfaces as an opaque 401 from the other service.

## Verify before you hand it over

Do not report an app as ready because the create call returned. Read it back and check the
scopes, redirect URIs, and server access are what you intended — several fields are normalized
on write. Then look at the SMART discovery document for the server the app will use
(`{base}/{server}/{fhirVersion}/.well-known/smart-configuration`) and confirm the endpoints and
capabilities the app expects are advertised there. If discovery looks stale after a
configuration change, refresh the SMART config rather than assuming the change did not land.

Give the operator the client ID, the authorization and token endpoints from discovery, and the
scope list. Never paste a client secret into a channel it will persist in; tell them where to
read it instead.

## Reference

Field-level detail lives in the deployment's own docs rather than here, so this skill stays
about the decisions:

- [SMART apps](https://github.com/Max-Health-Inc/proxy-smart/blob/main/docs/admin-ui/smart-apps.md)
  — registration, launch types, client configuration, dynamic client registration
- [Scope management](https://github.com/Max-Health-Inc/proxy-smart/blob/main/docs/admin-ui/scope-management.md)
  — SMART scope format, batch creation, protocol mappers
- [FHIR servers](https://github.com/Max-Health-Inc/proxy-smart/blob/main/docs/admin-ui/fhir-servers.md)
  and [Organizations](https://github.com/Max-Health-Inc/proxy-smart/blob/main/docs/admin-ui/organizations.md)
