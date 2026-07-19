# Keycloak version & feature reference

Single source of truth for **which Keycloak version proxy-smart runs and which feature
flags it enables**, to avoid ambiguity (e.g. assuming a preview feature has graduated when
it hasn't). Feature statuses below are verified against the authoritative
[`Profile.java` at the Keycloak `26.7.0` tag](https://github.com/keycloak/keycloak/blob/26.7.0/common/src/main/java/org/keycloak/common/Profile.java).

## Versions

| Component | Version | Where it's pinned |
| --- | --- | --- |
| Keycloak server (prod/beta, custom image) | **26.7.0** | [`Dockerfile.keycloak`](../Dockerfile.keycloak) (`FROM quay.io/keycloak/keycloak:26.7.0`) |
| Keycloak server (local dev) | **26.7.0** | `docker-compose.yml`, `docker-compose.development.yml` |
| Keycloak server (CDK stock fallback) | **26.7** | `deploy/infra/lib/keycloak-stack.ts` (`keycloakVersion` default; only used when no `imageUri`) |
| `@keycloak/keycloak-admin-client` (backend lib) | **26.7.0** | `backend/package.json` |

> The prod/beta image tag is `ghcr.io/max-health-inc/proxy-smart/keycloak:<env>-latest`, built
> from `Dockerfile.keycloak` in CI — the KC version lives in the Dockerfile, not the compose files.

## Feature flags

`kc.sh build --features=<list>` **adds** to Keycloak's default-on set — it does not replace it.
So only features that are **not** enabled-by-default need to be listed. proxy-smart lists
exactly two:

```
--features=cimd,resource-indicators
```

| Feature | KC 26.7 status | In `--features`? | Why proxy-smart needs it |
| --- | --- | --- | --- |
| `cimd` | **Experimental** | ✅ yes | OAuth Client ID Metadata Document — MCP `2025-11-25` client registration (recommended over DCR). |
| `resource-indicators` | **Experimental** | ✅ yes | RFC 8707 Resource Indicators — binds access-token `aud` to the requested FHIR/MCP resource so SMART + MCP audience validation is **fail-closed**. Needs an audience mapper to keep `aud` non-null. |
| `token-exchange-standard:v2` | **Default (on)** | ➖ no (automatic) | RFC 8693 Standard Token Exchange — required for SMART Health Links (SHL). On by default since it graduated; no flag needed. |
| `client-auth-federated` | **Default (on)** | ➖ no (automatic) | Federated-JWT client auth — validates proxy-signed client assertions. Graduated to default-on; no flag needed. |
| `organization` | **Default (on)** | ➖ no | KC Organizations. Enabled per-realm **at runtime** via a realm attribute (see `backend/src/init.ts` → `ensureOrganizationsEnabled`), not via `--features`. |
| `token-exchange` (legacy preview) | Preview, **deprecated** | ❌ no (removed) | Superseded by `token-exchange-standard:v2`. Was previously listed here; removed in the 26.7 upgrade. |

### Do NOT assume these have graduated

- **`resource-indicators` is still EXPERIMENTAL in 26.7** — it did *not* graduate. A prior
  `Dockerfile.keycloak` comment claimed "experimental until 26.7"; that was wrong and has been
  corrected. Treat both `cimd` and `resource-indicators` as experimental-in-production.
- Experimental features can be removed or changed between minor releases — re-verify against
  `Profile.java` for the target tag on every Keycloak bump.

## Upgrade checklist (when bumping Keycloak)

1. Check the [upgrading guide](https://www.keycloak.org/docs/latest/upgrading/index.html) for
   renamed/removed feature flags (e.g. 26.7 renamed `dynamic-scopes` → `parameterized-scopes`
   and removed `token-exchange-external-internal:v2`).
2. Re-verify each flag's `Type` in `Profile.java` at the target tag; drop any that became
   `Type.DEFAULT`, keep those still `PREVIEW`/`EXPERIMENTAL`.
3. Bump: `Dockerfile.keycloak`, both `docker-compose*.yml`, `@keycloak/keycloak-admin-client`,
   and the CDK `keycloakVersion` default.
4. `--http-relative-path` in the build **must** match the runtime `KC_HTTP_RELATIVE_PATH`
   (`/auth`) — a mismatch makes KC re-build *without* features at startup, crashing realm import.
5. Run `bun run test` (the `--isolate` variant) in `backend/` — plain `bun test` has known
   cross-test pollution and will report false failures.
6. Deploy to **beta first**; `--import-realm` is a no-op on an existing realm, so realm/client
   config changes in the export do **not** apply to already-provisioned environments.
