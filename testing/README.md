# SMART Compliance Testing Strategy

## Deployment Pipeline

| Branch | Version | Deploys To | Infrastructure |
|--------|---------|------------|----------------|
| `dev/*`, `develop/*` | - | - | Local CI stack |
| `develop` | alpha | - (dev-only release) | - |
| `test` | beta | VPS | Multiple containers |
| `main` | production | AWS | Production infra |

## Current State

The `smart-compliance-tests.yml` workflow runs Inferno SMART App Launch tests:

**Triggers:**
- Manual dispatch (`workflow_dispatch`)
- Called by other workflows (`workflow_call`)
- On version tags (`v*`)
- Weekly schedule (Mondays 6 AM UTC)

**Infrastructure:**
- Spins up full local stack in CI (Keycloak, PostgreSQL, Redis, HAPI FHIR, Inferno)
- Uses Playwright to automate Inferno web UI
- ~30 minute timeout

**Test Stages:**
- `alpha/` - Basic compliance checks (2 sequences)
- `beta/` - SMART 2.2.0 compliance (~17 sequences)  
- `production/` - Full ONC certification (~25+ sequences, bulk data)

## Planned Changes

### 1. Feature Branch Testing (`dev/*`, `develop/*`)

Run Inferno tests on feature branches with local infrastructure.

```yaml
on:
  push:
    branches:
      - 'dev/*'
      - 'develop/*'

concurrency:
  group: inferno-${{ github.ref }}
  cancel-in-progress: false
```

**Why:** Validate SMART compliance before merging to develop.

### 2. Deployed Instance Testing

Run tests against deployed instances instead of local stack:

| Branch | Test Against | Config |
|--------|--------------|--------|
| `test` | VPS (beta) | `testing/beta/` |
| `main` | AWS (production) | `testing/production/` |

**Why:** Verify deployed instances work, catch deployment-specific issues.

### 3. Concurrency Control

Only one Inferno test run at a time **per branch** (they're expensive).

```yaml
concurrency:
  group: inferno-${{ github.ref }}
  cancel-in-progress: false
```

New runs on the same branch wait or skip if one is already running. Different branches can run in parallel.

## Config Files

| Folder | Branch | Target |
|--------|--------|--------|
| `dev/` | `dev/*`, `develop/*` | Local CI stack |
| `alpha/` | `develop` | Local CI stack (dev-only release) |
| `beta/` | `test` | VPS (deployed) |
| `production/` | `main` | AWS (deployed) |

## TODO

- [x] Add `testing/dev/inferno-config.json` for local CI
- [x] Update `testing/alpha/inferno-config.json` for local CI testing
- [x] Update `testing/beta/inferno-config.json` with VPS URL (placeholder)
- [x] Update `testing/production/inferno-config.json` with AWS URL (placeholder)
- [x] Update workflow to trigger on `dev/*`, `develop/*` branches (local stack)
- [x] Update workflow to trigger on `develop`/`test`/`main` (deployed instances)
- [x] Add concurrency group per branch
- [ ] Update beta/production URLs with actual deployed URLs
- [ ] Skip local services (Keycloak, HAPI, backend) when testing deployed instances
- [ ] Add workflow condition to only start local services for `target: local`
