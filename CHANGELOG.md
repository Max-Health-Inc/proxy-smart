# Changelog

All notable changes to Proxy Smart will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.0.3-alpha.202603270233.e884c722] - 2026-03-27

- 🐛 Bug Fixes: auto-logout on monitoring 401 and improvements to E2E test stability
- 🔧 Chores & Improvements: CI/CD and versioning updates for alpha pre-release 0.0.3-alpha.202603270233.e884c722

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/260


## [0.0.3-alpha.202603270112.2b029cbe] - 2026-03-27

- ✨ Features: FHIR proxy request monitoring with 429/error tracking (quotentiroler)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/259


## [0.0.3-alpha.202603270100.b4b79f74] - 2026-03-27

- 🐛 Bug Fixes: Rate-limit avoidance for patient-portal via batch FHIR requests to reduce 429s
- 🔧 Chores & Improvements: Update version to 0.0.3-alpha.202603270100.b4b79f74 (alpha)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/258


## [0.0.3-alpha.202603270005.c4f44147] - 2026-03-27

- ✨ Features: Add E2E Playwright tests for patient-portal (70 test specs)
- 🔧 Chores & Improvements: Testing updates and internal maintenance (dev SMART compliance reports)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/257


## [0.0.3-alpha.202603262231.bcef1334] - 2026-03-27

- 🔧 Chores & Improvements: Update version to 0.0.3-alpha.202603262231.bcef1334
- ✨ Features: SMART scope protocol mapper auto-provisioning, management UI, and logout fixes (quotentiroler)
- 📚 Documentation: CHANGELOG update note (from PR #255)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/256


## [0.0.3-alpha.202603262210.ca39219f] - 2026-03-26

- 🐛 Bug Fixes: set postLogoutRedirectUri in all SMART apps (quotentiroler)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/255


## [0.0.3-alpha.202603262146.90e44e07] - 2026-03-26

- 🔧 Chores & Improvements: Internal updates and maintenance
  - Fix: use mutable token ref in MCP sessions to prevent stale auth

Note: No user-facing features, bug fixes beyond internal auth fix, or documentation changes detected.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/254


## [0.0.3-alpha.202603262109.1f1eb8d7] - 2026-03-26

- ✨ Features:
  - Add missing params schemas to admin routes for MCP tool exposure (quotentiroler)

- 🔧 Chores & Improvements:
  - CI/CI: Update version references to 0.0.3-alpha.202603262109.1f1eb8d7
  - Documentation: Update CHANGELOG with PR metadata

Note: No breaking changes, bug fixes, or documentation/content changes beyond housekeeping detected.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/253


## [0.0.3-alpha.202603262009.6c2d2717] - 2026-03-26

- ✨ Features: Add comprehensive SMART Access Control tests (scope, write blocking, role-based filtering) plus test utilities.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/252


## [0.0.3-alpha.202603261959.0eedf22a] - 2026-03-26

- ✨ Features: SMART on FHIR access control feature set
  - Adds configurable access control with scope enforcement, role-based filtering, and optional write blocking
  - Introduces SMART access control module and core types, wired into backend config
  - Adds new backend route integration for FHIR access control

- 🔧 Chores & Improvements: CI/config updates for new feature
  - Extends backend/config.ts with accessControl options (scopeEnforcement, roleBasedFiltering, readOnlyForUsers, patientScopedResources)

- 📚 Documentation: (none)

- ⚠️ Breaking Changes: (none)

- 🐛 Bug Fixes: (none)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/251


## [0.0.3-alpha.202603261915.b85b32ac] - 2026-03-26

- ✨ Features: Introduce SMART on FHIR access control
  - Add configurable accessControl settings (scopeEnforcement, roleBasedFiltering, readOnlyForUsers, patientScopedResources)
  - Implement SMART access control module with scope enforcement, role-based filtering, and optional write blocking
  - Wire config usage and logging into backend routes (FHIR)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/250


## [0.0.3-alpha.202603261227.e58ce3fa] - 2026-03-26

- 🐛 Bug Fixes: ESLint config fixes, lint error resolutions, CSS build fixes, and App Store button issue (quotentiroler)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/249


## [0.0.3-alpha.202603261153.437fd3f4] - 2026-03-26

- ✨ Features: None
- 🐛 Bug Fixes: None
- 📚 Documentation: None
- 🔧 Chores & Improvements: 
  - Refactor: remove redundancies and consolidate shared code (quotentiroler)
- ⚠️ Breaking Changes: None

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/248


## [0.0.3-alpha.202603261142.f2bbdb5a] - 2026-03-26

- ✨ Features: wire IAL enforcement in FHIR proxy and complete Person link management UI
- 🔧 Chores & Improvements: internal maintenance (CI/CD and testing updates)
- 📚 Documentation: update CHANGELOG.md with PR notes

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/247


## [0.0.3-alpha.202603260616.9f8b1020] - 2026-03-26

- 🔧 Chores & Improvements: Cleanup and maintenance of deploy-beta workflow
  - Performs remote Docker prune/cleanup (images, containers, volumes, builders with 2GB kept) via SSH and outputs disk usage after cleanup

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/246


## [0.0.3-alpha.202603260600.c6b0d8d9] - 2026-03-26

- 🐛 Bug Fixes: Remove hardcoded fake data from CertificatesDialog and LaunchContextManager (quotentiroler)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/244


## [0.0.3-alpha.202603260505.b938bcb4] - 2026-03-26

- ✨ Features: Wire up real SMART capabilities in FHIR server management UI (quotentiroler)
- 🔧 Chores & Improvements: Update dev SMART compliance report
- 🔧 Chores & Improvements: Update version to 0.0.3-alpha.202603260505.b938bcb4
- 📚 Documentation: Update CHANGELOG.md for PR #242

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/243


## [0.0.3-alpha.202603260458.782b5ec9] - 2026-03-26

- 🔧 Chores & Improvements: Internal updates and maintenance
  - Refactor: replace client-side CQL engine with server-side (quotentiroler)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/242


## [0.0.3-alpha.202603260233.96d79d26] - 2026-03-26

- ✨ Features: wire up CQL engine and Smart Forms SDC renderer in DTR app (quotentiroler)

- 🔧 Chores & Improvements: update dev SMART compliance report

- 🔧 Chores & Improvements: update version to 0.0.3-beta.202603260210.50141671 (beta)
- 🔧 Chores & Improvements: update version to 0.0.3-alpha.202603260233.96d79d26 (alpha)

Note: No user-facing breaking changes, docs, or other fixes detected.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/241


## [0.0.3-alpha.202603260210.50141671] - 2026-03-26

- 🔧 Chores & Improvements: Deduplicated app configs, CSS theme, chart colors, and admin tabs into shared-ui
- 📚 Documentation: Updated CHANGELOG entry for PR #239

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/240


## [0.0.3-alpha.202603252257.1f554a11] - 2026-03-26

- ✨ Features: Register patient-portal in App Store and mono build pipeline (quotentiroler)

- 🔧 Chores & Improvements: Update dev SMART compliance report (proxy-smart-releaser[bot])
- 🔧 Chores & Improvements: Update version to 0.0.3-beta.202603252246.f07ac170 (beta) (github-actions[bot])
- 📚 Documentation: Update CHANGELOG.md for PR #238 [skip ci] (github-actions[bot])
- 🔧 Chores & Improvements: Update version to 0.0.3-alpha.202603252257.1f554a11 (alpha) (github-actions[bot])

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/239


## [0.0.3-alpha.202603252246.f07ac170] - 2026-03-25

- 🔧 Chores & Improvements: Introduced file-backed persistence for dynamically added FHIR servers
  - Add fs/path usage, PersistedServer interface, and SERVERS_JSON_PATH
  - Implement loadPersistedServers and savePersistedServers
  - Prepare groundwork for persisting servers to fhir-servers.json
- 🔧 Chores & Improvements: Standardize newline handling and update ignore rules for backend
  - Update backend/.gitignore with fhir-servers.json
  - Ensure mcp.json newline issue is fixed

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/238


## [0.0.3-alpha.202603252123.0938d55e] - 2026-03-25

- ✨ Features: Scaffold international patient portal with IPS/IPA (quotentiroler)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/237


## [0.0.3-alpha.202603252036.bae2a0a9] - 2026-03-25

- ✨ Features: surface brand logo in consent-app and dtr-app (quotentiroler)
- 🔧 Chores & Improvements: update beta and dev SMART compliance reports (proxy-smart-releaser[bot])
- 🔧 Chores & Improvements: update version to 0.0.3-alpha.202603252036.bae2a0a9 (github-actions[bot])

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/236


## [0.0.3-alpha.202603251947.f10c9f3b] - 2026-03-25

- ✨ Features: pass OPENAI_API_KEY through beta deployment pipeline (quotentiroler)
- 🔧 Chores & Improvements: update beta and dev SMART compliance reports (proxy-smart-releaser[bot])
- 🔧 Chores & Improvements: update changelog reference and version metadata (CI)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/235


## [0.0.3-alpha.202603251933.c56cbe7f] - 2026-03-25

- 🐛 Bug Fixes: Preserve bundle type on 304 response — return empty string cast to bundle type when If-None-Match matches ETag (ETag and Cache-Control behavior unchanged)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/234


## [0.0.3-alpha.202603251928.7a647e6d] - 2026-03-25

- ✨ Features: MCP resources, FHIR server delete, AI assistant fixes, IAL encoding fix; user-access branding, dynamic roles, code cleanup
- 🧪 ⚠️ Breaking Changes: (none)
- 🐛 Bug Fixes: wrap IALSettings hardcoded strings with t() for i18n
- 📚 Documentation: update CHANGELOG.md for PR #231, PR #232
- 🔧 Chores & Improvements: version bumps, CI/CD housekeeping, SMART compliance report updates, code cleanup

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/233


## [0.0.3-alpha.202603251726.4eb5bd90] - 2026-03-25

- ✨ Features: MCP resources, FHIR server delete, AI assistant fixes, IAL encoding fix
- 🔧 Chores & Improvements: user-access branding, dynamic roles, code cleanup
- 📚 Documentation: update CHANGELOG.md for PR #231
- ⚠️ Breaking Changes: none
- 🐛 Bug Fixes: (none explicit beyond features)
Note: Only changes since last release included.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/232


## [0.0.3-alpha.202603241627.cdee7ff7] - 2026-03-25

- ✨ Features: user-access branding, dynamic roles, code cleanup (quotentiroler)
- 🔧 Chores & Improvements: internal maintenance and CI/CD updates
- 📚 Documentation: changelog update for PR #230

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/231


## [0.0.3-alpha.202603240754.fe065af2] - 2026-03-24

- 🔧 Chores & Improvements: UI spacing adjustments for hero container across breakpoints; header bottom padding tweaks
- 🔧 Chores & Improvements: Added enum-like validation sets and runtime sanitization for appType (fallback to backend-service or standalone-app) in admin routes

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/230


## [0.0.2-beta.202603240700.0cadb793] - 2026-03-24

- 🔧 Chores & Improvements: Update version to 0.0.2-beta.202603240700.0cadb793 (beta)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/199



- 🔧 Chores & Improvements: CI workflow updates and versioning
  - Enable production release workflow and fix workflow_dispatch
  - Update version to 0.0.2-beta.202603240700.0cadb793 (beta)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/228


## [0.0.2-alpha.202603240346.274d844f] - 2026-03-24

- ✨ Features: Add KC_HOSTNAME_STRICT=true for beta with redirect URIs for consent/dtr apps
- 🔧 Chores & Improvements: Testing updates for beta and dev SMART compliance reports
- 🔧 Chores & Improvements: Version bumps for beta and alpha releases

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/226


## [0.0.2-alpha.202603240241.095e5351] - 2026-03-24

- ✨ Features: AI discoverability, SEO metadata, and docs navigation (quotentiroler)
- 🔧 Chores & Improvements: CI/CD and internal testing updates (beta/alpha SMART reports)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/225


## [0.0.2-alpha.202603240158.5d8c65e8] - 2026-03-24

- 🔧 Chores & Improvements: Set Vite base paths for consent-app and dtr-app to /apps/consent/ and /apps/dtr/, fixing asset 404s under beta subpaths

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/224


## [0.0.2-alpha.202603240142.79e45c32] - 2026-03-24

- ⚠️ Breaking Changes: None
- ✨ Features: None
- 🐛 Bug Fixes: None
- 📚 Documentation: None
- 🔧 Chores & Improvements: None

Note: No meaningful changes beyond maintenance/version updates.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/223


## [0.0.2-alpha.202603232114.52d8e7a0] - 2026-03-24

- ✨ Features: None
- 🐛 Bug Fixes:
  - fix: replace typeof fetch with explicit signature for Bun compatibility
- 🔧 Chores & Improvements:
  - chore: update version to 0.0.2-alpha.202603232114.52d8e7a0
- 📚 Documentation:
  - docs: update CHANGELOG.md for PR #221
- ⚠️ Breaking Changes: None

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/222


## [0.0.2-alpha.202603232047.4de7c7aa] - 2026-03-23

- 🔧 Chores & Improvements: Documentation routing and assets handling updates
  - Add VitePress docs SPA fallback routes and per-file asset fallback logic
  - Rename and adjust docs API paths and route handling for /docs-api vs /docs
  - Update docs-related URL generation and static serving behavior
  - Update docker-compose beta config to allow /docs and /docs-api paths
- 🔧 Chores & Improvements: Workspace and build optimizations
  - Copy additional lib folders for consent-app and dtr-app in Dockerfile
  - Narrow workspace scope to avoid install failures (backend, ui, shared-ui, consent-app, dtr-app)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/221


## [0.0.2-beta.202603231957.d98e9bfd] - 2026-03-23

- 🔧 Chores & Improvements: Remove committed app bundles with baked localhost URLs (quotentiroler)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/219



- 🔧 Chores & Improvements: Dockerfile: copy additional lib folders for consent-app and dtr-app; adjust package.json workspaces to include only backend, ui, shared-ui, consent-app, dtr-app to avoid workspace install failures

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/220


## [0.0.2-alpha.202603231957.d98e9bfd] - 2026-03-23

- 🔧 Chores & Improvements: Expand Caddy reverse proxy support (add 3_reverse_proxy for port 8445 in docker-compose.beta.yml; extend matching to additional upstreams with the same port)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/218


## [0.0.2-alpha.202603231949.c8b88e61] - 2026-03-23

- 🔧 Chores & Improvements: Expand reverse proxy setup to include a second Caddy proxy (3_reverse_proxy) on port 8445 in docker-compose.beta.yml and extend upstream matching to cover additional upstreams with the same port

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/217


## [0.0.2-alpha.202603231939.8fee9586] - 2026-03-23

- 🔧 Chores & Improvements: Clean up Caddy path handling by removing trailing slash in backend path for fhir-servers, enabling "fhir-servers" and "fhir-servers/*" paths.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/216


## [0.0.2-beta.202603231842.93e412a1] - 2026-03-23

- 🔧 Chores & Improvements: Fix Caddy backend path split by removing trailing slash for fhir-servers, adding explicit "fhir-servers" and "fhir-servers/*" paths

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/214



- 🔧 Chores & Improvements: Fixed Caddy path split by removing trailing slash in backend path, ensuring proper fhir-servers routing (now "fhir-servers" and "fhir-servers/*" instead of "fhir-servers/*" only).

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/215


## [0.0.2-beta.202603231648.0e8f43e2] - 2026-03-23

- 🔧 Chores & Improvements: Update beta/dev SMART compliance reports (CI skips)  
- 🔧 Chores & Improvements: Center scroll indicator correctly (quotentiroler)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/211



- ✨ Features: Add new SVG asset for backend proxy icon (proxy-smart.svg, 32x32, red)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/212


## [0.0.2-alpha.202603231648.0e8f43e2] - 2026-03-23

- 🔧 Chores & Improvements: UI spacing tweak in backend/public/index.html (adjusted text-indent/margin-right for mono font label)
- 🔧 Chores & Improvements: Expand environment ignore patterns to cover recursive .env and local variants across all folders

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/210


## [0.0.2-alpha.202603231643.9fb5f430] - 2026-03-23

- 🔧 Chores & Improvements: Expand environment ignore patterns to recursively ignore env files (**/.env, **/.env.local, **/.env.*.local) alongside existing rules

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/209


## [0.0.2-alpha.202603231631.09cefee1] - 2026-03-23

- ✨ Features: None
- 🐛 Bug Fixes: None
- 📚 Documentation: 
  - docs: add access control and monitoring documentation
  - docs: update CHANGELOG.md for PR #207
- 🔧 Chores & Improvements: 
  - chore(testing): update dev SMART compliance report
- ⚠️ Breaking Changes: None

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/208


## [0.0.2-alpha.202603231607.00c7934f] - 2026-03-23

- 🔧 Chores & Improvements: Documentation overhaul for AI MCP integration and redesigned AI Assistant flow; UI routing and setupTools() adjustments
- 🔧 Chores & Improvements: CI/test enhancements and certification readiness for SMART 2.2.0; convert CI checks to automated adoption
- 🔧 Chores & Improvements: Version management and monorepo organization updates; root version as truth
- 🔧 Chores & Improvements: Release process update; shift from Alpha to Branch Flow with new three-stage promotion diagram and clarified automated beta/testing PR flow

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/207


## [0.0.2-alpha.202603231553.7ab93fa3] - 2026-03-23

- 🔧 Chores & Improvements: Refined tool-call handling to trigger only on exact type 'tool-call' with a present toolName; updated comment to reflect start-only behavior

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/206


## [0.0.2-alpha.202603231549.74ce61a0] - 2026-03-23

- ✨ Features
  - 🧪 Auto-PR: Merge develop → test workflows: add step to resolve version conflicts when develop is behind test, preferring develop in string merges and handling conflict resolution.

- 🔧 Chores & Improvements
  - 🧪 CI/CD: Pass generated token to checkout step and remove hard-coded git remote URL updates in workflow jobs.
  - 🔧 CI/CD: Refine bot user config and use GH token for remote in automation steps.
  - 📚 Documentation: Update deployment notification workflow to simplify Discord payload construction and centralize deployment-related fields. 
  - ⚠️  Breaking Changes: None detected

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/205


## [0.0.2-beta.202603231421.2de1435a] - 2026-03-23

- 🔧 Chores & Improvements: Clean startup by removing any existing docker container named caddy-proxy before starting the Caddy proxy

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/204


## [0.0.2-alpha] - 2026-03-14

### ✨ Features

- AI assistant with RAG for documentation queries
- MCP server (Streamable HTTP) auto-generated from backend OpenAPI spec
- External MCP server connectivity with official SDK (JSON-RPC 2.0)
- SMART on FHIR proxy with Keycloak integration
- Admin UI for managing SMART apps, FHIR servers, users, and roles
- Access control integration (Kisi, UniFi Access)
- Quick Setup Templates for MCP server configuration
- Docker-ready deployment (mono-container and multi-container)

### 🔧 Chores & Improvements

- Refactored AI MCP client to use official `@modelcontextprotocol/sdk`
- Migrated from Node.js-based AI changelog to Python-based workflow scripts
- Updated dependencies: vite 8.0.0, vitest 4.1.0, @types/node 25.5.0
