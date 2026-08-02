# Keycloak version & feature reference

Single source of truth for **which Keycloak version proxy-smart runs and which feature
flags it enables**, to avoid ambiguity (e.g. assuming a preview feature has graduated when
it hasn't). Feature statuses below are verified against the authoritative
[`Profile.java` at the Keycloak `26.6.4` tag](https://github.com/keycloak/keycloak/blob/26.6.4/common/src/main/java/org/keycloak/common/Profile.java).

## Versions

Server and admin-client are **both pinned to 26.6.4** — the latest release where the
Node admin-client works (see "Do NOT upgrade to 26.7.0" below).

| Component | Version | Where it's pinned |
| --- | --- | --- |
| Keycloak server (prod/beta, custom image) | **26.6.4** | [`Dockerfile.keycloak`](../Dockerfile.keycloak) (`FROM quay.io/keycloak/keycloak:26.6.4`) |
| Keycloak server (local dev) | **26.6.4** | `docker-compose.yml`, `docker-compose.development.yml` |
| Keycloak server (CDK stock fallback) | **26.6.4** | `deploy/infra/lib/keycloak-stack.ts` (`keycloakVersion` default; only used when no `imageUri`) |
| `@keycloak/keycloak-admin-client` (backend lib) | **26.6.4** (exact pin, no caret) | `backend/package.json` |

> The prod/beta image tag is `ghcr.io/max-health-inc/proxy-smart/keycloak:<env>-latest`, built
> from `Dockerfile.keycloak` in CI — the KC version lives in the Dockerfile, not the compose files.

## Do NOT upgrade to 26.7.0 (admin-client is broken)

`@keycloak/keycloak-admin-client@26.7.0` has a **regression in `client_credentials`
auth**: `admin.auth({ grantType: 'client_credentials', clientId, clientSecret })` fails
with `undefined is not an object (evaluating 'token.split')` (the returned access token is
undefined and `utils/decode.js` crashes decoding it). Reproduced against a live KC 26.7
server; 26.6.3 and 26.6.4 both succeed against the same server.

Impact if it slips in: **every** startup `admin.auth(client_credentials)` throws — most
visibly `refreshCorsOrigins()` falls back to static origins, so all first-party browser
apps whose origin comes only from a Keycloak client `webOrigins` (dicom/patient/consent/dtr
`*.beta.maxhealth.tech`) lose CORS and can't complete SMART discovery. The admin-client is
therefore pinned to an **exact** `26.6.4` (no `^`). Re-evaluate only when a newer client
release fixes the client_credentials flow.

## Feature flags

`kc.sh build --features=<list>` **adds** to Keycloak's default-on set — it does not replace it.
So only features that are **not** enabled-by-default need to be listed. proxy-smart lists
exactly two:

```
--features=cimd,resource-indicators
```

| Feature | KC 26.6.4 status | In `--features`? | Why proxy-smart needs it |
| --- | --- | --- | --- |
| `cimd` | **Experimental** | ✅ yes | OAuth Client ID Metadata Document — MCP `2025-11-25` client registration (recommended over DCR). |
| `resource-indicators` | **Experimental** | ✅ yes | RFC 8707 Resource Indicators — binds access-token `aud` to the requested FHIR/MCP resource so SMART + MCP audience validation is **fail-closed**. Needs an audience mapper to keep `aud` non-null. |
| `token-exchange-standard:v2` | **Default (on)** | ➖ no (automatic) | RFC 8693 Standard Token Exchange — required for SMART Health Links (SHL). On by default since it graduated; no flag needed. |
| `client-auth-federated` | **Default (on)** | ➖ no (automatic) | Federated-JWT client auth — validates proxy-signed client assertions. Graduated to default-on; no flag needed. |
| `organization` | **Default (on)** | ➖ no | KC Organizations. Enabled per-realm **at runtime** via a realm attribute (see `backend/src/init.ts` → `ensureOrganizationsEnabled`), not via `--features`. |
| `token-exchange` (legacy preview) | Preview, **deprecated** | ❌ no (removed) | Superseded by `token-exchange-standard:v2` (default-on). Was previously listed here; removed as redundant. |

### Do NOT assume these have graduated

- **`resource-indicators` is still EXPERIMENTAL** (in both 26.6.4 and 26.7) — it did *not*
  graduate at 26.7. A prior `Dockerfile.keycloak` comment claimed "experimental until 26.7";
  that was wrong and has been corrected. Treat both `cimd` and `resource-indicators` as
  experimental-in-production.
- Experimental features can be removed or changed between minor releases — re-verify against
  `Profile.java` for the target tag on every Keycloak bump.

## Upgrade checklist (when bumping Keycloak)

1. **Test the admin-client's `client_credentials` auth first** — 26.7.0 broke it (above).
   Run a quick `admin.auth({grantType:'client_credentials'})` against the target server
   before committing the bump.
2. Check the [upgrading guide](https://www.keycloak.org/docs/latest/upgrading/index.html) for
   renamed/removed feature flags (e.g. 26.7 renamed `dynamic-scopes` → `parameterized-scopes`
   and removed `token-exchange-external-internal:v2`).
3. Re-verify each flag's `Type` in `Profile.java` at the target tag; drop any that became
   `Type.DEFAULT`, keep those still `PREVIEW`/`EXPERIMENTAL`.
4. Bump in lockstep: `Dockerfile.keycloak`, both `docker-compose*.yml`,
   `@keycloak/keycloak-admin-client`, and the CDK `keycloakVersion` default.
5. `--http-relative-path` in the build **must** match the runtime `KC_HTTP_RELATIVE_PATH`
   (`/auth`) — a mismatch makes KC re-build *without* features at startup, crashing realm import.
6. Run `bun run test` (the `--isolate` variant) in `backend/` — plain `bun test` has known
   cross-test pollution and will report false failures.
7. Deploy to **beta first**; `--import-realm` is a no-op on an existing realm, so realm/client
   config changes in the export do **not** apply to already-provisioned environments.

## Realm export constraints

`--import-realm` writes straight into Keycloak's schema, so the export is bound by
that schema's column widths. Overflowing one aborts the import, and Keycloak then
**refuses to start at all** — the failure looks like a broken deployment, not a bad
JSON value:

```
ERROR: value too long for type character varying(255)
[update KEYCLOAK_ROLE set CLIENT=?,...,DESCRIPTION=?,NAME=?,...]
ERROR: Failed to start server in (development) mode
```

Practical limits, all `varchar(255)`: role `name` and `description`, client `name`
and `description`, client-scope `description`.

Two further rules, both learned the hard way:

- **No `"//"` pseudo-comment keys.** JSON has no comments, and Keycloak deserializes
  `users[]` into `UserRepresentation` with unknown fields rejected. See the seeded
  administrator note in [deployment.md](deployment.md).
- **Put the reasoning here, not in the data.** A description is a UI label with a hard
  length cap, not a place for rationale.

`backend/test/realm-export-importable.test.ts` enforces all of this across every
export.

### The `admin` composite

`admin` grants the per-product admin roles rather than meaning anything to a service
itself, so "administers everything" is expressed once instead of re-encoded per
service. Each product contributes its own role; this repo's export can only declare
the one it owns (`proxy-smart-admin`).

`proxy-smart-admin` is product-namespaced because the realm is shared: a bare `admin`
would mean administrator of *something*, and the realm also carries roles belonging to
other Max Health services (for example llm-gateway's `gateway-admin`).
