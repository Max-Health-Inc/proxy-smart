# Changelog

All notable changes to Proxy Smart will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.0.5-alpha.202604131802.68b7ac1e] - 2026-04-13

- 🔧 Chores & Improvements: Sync package versions after rebase
- 🔧 Chores & Improvements: Start infra services before canary; dump logs on failure
- 📚 Documentation: Update CHANGELOG.md for PR #356

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/357


## [0.0.5-alpha.202604131748.f8c77aab] - 2026-04-13

- ✨ Features: Introduces expectedIssuer getter for OpenID issuer validation; lazy JWKS handling with runtime-config-aware client and caching; dynamic reinitialization on JWKS URI changes
- 🔧 Chores & Improvements: Test utilities updated to use a no-op logger proxy to safely isolate tests; ensured docker network for canary starts only if proxy-smart-beta-network exists to prevent issues after prune/full stop
- ⚠️ Breaking Changes: None
- 📚 Documentation: None

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/356


## [0.0.5-alpha.202604131657.d291256d] - 2026-04-13

- 🔧 Chores & Improvements: Update GitHub Actions caching scope for beta backend image (cache-from/cache-to) from beta-backend to beta-backend-v2

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/354


## [0.0.5-alpha.202604131634.3494abfa] - 2026-04-13

- ✨ Features: 
  - Introduced OpenDataLoader-based PDF extraction path (PDF to Markdown via @opendataloader/pdf)
  - Added PDF extraction types and engine plumbing (PdfEngine, PdfExtractResult)

- 🔧 Chores & Improvements:
  - Dockerfiles updated to install Java 21 JRE across backend and mono/prod stages; clarifying Java 21 requirement for @opendataloader/pdf
  - Backend build and package adjustments:
    - Refined build command usage for backend (target handling and removing external sharp reference)
    - Replaced zerox dependency with @opendataloader/pdf in backend package.json
  - Updated document-import flows to pass engine through admin and API routes to use the new PDF extraction path

- ⚠️ Breaking Changes: None detected

- 📚 Documentation: None detected

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/353


## [0.0.5-alpha.202604131611.0165ae0c] - 2026-04-13

- 🔧 Chores & Improvements: Minor string escaping update in deploy-beta workflow (no logic changes)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/352


## [0.0.5-alpha.202604131601.650eb30a] - 2026-04-13

- 🔧 Chores & Improvements: Add health checks across services and Docker Compose, including health-based readiness for Caddy reverse_proxy entries and a new healthcheck script
- 🔧 Chores & Improvements: Implement blue/green canary deployment flow with separate canary container and pre-swap validation
- 🔧 Chores & Improvements: Update beta deploy workflow to use canary flow and Bun-based backend health check on port 8445

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/351


## [0.0.5-alpha.202604131554.90d89c8d] - 2026-04-13

- 🔧 Chores & Improvements: Beta deploy workflow updated to blue/green canary flow with separate canary container and pre-swap validation on port 9445
- 🔧 Chores & Improvements: docker-compose.beta.yml now includes backend healthcheck on port 8445 using Bun for /health, plus standard healthcheck settings

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/350


## [0.0.5-alpha.202604131547.1bf214db] - 2026-04-13

- 🔧 Chores & Improvements: Exclude external dependency (sharp) from bundling in build process (bun build --external sharp) to reduce bundle size and avoid bundling issues.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/349


## [0.0.5-alpha.202604131524.f9c8fc5d] - 2026-04-13

- 🔧 Chores & Improvements: CI optimizations (skip SMTP config when already set, reduce Keycloak wait)

- 📚 Documentation: Update CHANGELOG for PR #347

- 🔧 Chores & Improvements: Update version references to 0.0.5-alpha.202604131524.f9c8fc5d

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/348


## [0.0.5-alpha.202604131404.221b9263] - 2026-04-13

- 🔧 Chores & Improvements: CI/CD housekeeping and maintenance (Docker pruning, SMART compliance report updates)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/347


## [0.0.5-alpha.202604131352.a13c604e] - 2026-04-13

- 🔧 Chores & Improvements: PACS status pre-check on mount and enhanced status handling across UI and backend
  - Dashboard.tsx: add PACS status check on mount; store pacsAvailable state; integrate non-blocking check in data load flow
  - DicomUpload.tsx: extend status handling with PACS pre-check; new PacsStatus type usage; added ServerOff icon; new UploadStep "checking"/"unavailable"; initial step set to "checking"
  - dicomweb.ts: introduce PacsStatus type; implement checkPacsStatus() calling /status; improve STOW error handling with connection/refusal details
  - backend dicomweb routes: enhanced error logging for connection/refused scenarios; friendlier messages; minor status handling improvements

- ⚠️ Breaking Changes: None identified

- ✨ Features: PACS availability status integration and pre-checks

- 🐛 Bug Fixes: Improved error messaging for upstream/DICOMweb issues

- 📚 Documentation: None identified

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/346


## [0.0.5-alpha.202604131345.23848337] - 2026-04-13

- 🔧 Chores & Improvements: PACS status pre-check on mount integrated into dashboard and upload flow; enhanced PacsStatus typing and status handling across dicomweb.ts and UI components
- 🐛 Bug Fixes: Improved error logging for backend dicomweb routes to include connection/refusal details and friendlier messages
- ⚠️ Breaking Changes: None detected
- 📚 Documentation: None detected
- ✨ Features: Added PACS status check flow (including new UploadStep states and non-blocking availability check)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/345


## [0.0.5-alpha.202604131328.38a77534] - 2026-04-13

- ✨ Features: patient DICOM upload via Orthanc PACS (beta)
- 🔧 Chores & Improvements: update dev SMART compliance report
- 🔧 Chores & Improvements: preserve line endings in version.js to avoid dirty tree on Windows

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/344


## [0.0.5-alpha.202604131315.6d98337c] - 2026-04-13

- ⚠️ Breaking Changes: None
- ✨ Features: None
- 🐛 Bug Fixes: In pre-push hook, discard potential no-op file rewrites from line endings by running git checkout -- . before exiting to keep the tree clean
- 📚 Documentation: None
- 🔧 Chores & Improvements: None

Note: Only one meaningful change detected; grouped as a bug fix.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/343


## [0.0.5-alpha.202604131159.af43b3e2] - 2026-04-13

- ✨ Features: PDF document import pipeline (OCR → AI → FHIR validation + patient portal review UI)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/342


## [0.0.5-alpha.202604130310.7e87e126] - 2026-04-13

- ✨ Features: add FHIR sample data seeding on beta deploy
- 🐛 Bug Fixes: none
- 📚 Documentation: update CHANGELOG.md for PR #340
- 🔧 Chores & Improvements: update SMART compliance reports (beta/dev/test) [skip ci], update version to 0.0.5-alpha.202604130310.7e87e126 [skip ci]
- ⚠️ Breaking Changes: none

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/341


## [0.0.5-alpha.202604130118.674918ed] - 2026-04-13

- 🔧 Chores & Improvements: Update beta/alpha SMART compliance reports and testing tooling
- 🐛 Bug Fixes: Deploy health check uses correct Keycloak management port (9000)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/340


## [0.0.5-alpha.202604130043.6db4bfd4] - 2026-04-13

- 🔧 Chores & Improvements: Dynamic Keycloak IP resolution for beta deploy workflow; replaces hard-coded localhost with KC_BASE, adds guard for unresolved IP, and updates health check/token endpoints accordingly

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/339


## [0.0.5-beta.202604122030.b73417f0] - 2026-04-13

- ✨ Features: expose GET routes as tools with readOnlyHint; add admin toggle (quotentiroler)
- 🐛 Bug Fixes: none
- 📚 Documentation: none
- 🔧 Chores & Improvements: update beta SMART compliance reports (CI skip) across testing/dev; update version to 0.0.5-beta.202604122030.b73417f0
- ⚠️ Breaking Changes: none

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/337



- ✨ Features: Expose GET routes as tools with readOnlyHint; add admin toggle
- 🐛 Bug Fixes: ExposeResourcesAsTools to test configs and readOnly to RAG tool
- 🔧 Chores & Improvements: Sync package versions after rebase; update beta SMART compliance reports; update dev/beta SMART reports
- 📚 Documentation: Update CHANGELOG.md for PR #337

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/338


## [0.0.5-beta.202604122004.5a4c4b6d] - 2026-04-12

- ✨ Features: Auto-configure Keycloak SMTP on startup if RESEND_API_KEY is set (backend)
- 🔧 Chores & Improvements: CI/CD and testing housekeeping (beta SMART compliance reports)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/335


## [0.0.5-alpha.202604122004.5a4c4b6d] - 2026-04-12

- 🔧 Chores & Improvements: Use first supported server for endpoints; SMART_CONFIG_URL and BASE_FHIR_URL now derive from the first supported server (fallback remains if none exist)

- 🔧 Chores & Improvements: Bump pre-release version to 0.0.5-beta.202604121818.799a8983 across apps and e2e package

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/334


## [0.0.5-alpha.202604121912.0eb1a789] - 2026-04-12

- 🔧 Chores & Improvements: Select first supported server for endpoints; derive SMART_CONFIG_URL and BASE_FHIR_URL from that server (fallback to empty/null if none). This refines endpoint configuration behavior.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/333


## [0.0.5-beta.202604121818.799a8983] - 2026-04-12

- ✨ Features: enable forgot-password with Resend SMTP (quotentiroler)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/331



- 🔧 Chores & Improvements: Bump pre-release version to 0.0.5-beta.202604121818.799a8983 across all apps and e2e package (no code changes)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/332


## [0.0.5-alpha.202604121808.dc78aff2] - 2026-04-12

- 🔧 Chores & Improvements: Refactor UI into focused modules (SmartAppAddForm, SmartProxyOverview)
- 🔧 Chores & Improvements: Sync package versions after rebase
- 📚 Documentation: Update CHANGELOG.md for PR #328

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/329


## [0.0.5-alpha.202604121755.3e5e8666] - 2026-04-12

- 🔧 Chores & Improvements: Major refactor of AdminAuditDashboard into modular structure
  - Replaced monolithic AdminAuditDashboard.tsx with modular component set under AdminAuditDashboard/
  - Added core component and tab subcomponents: OverviewTab, EventLogTab, AnalyticsTab, FailuresTab
  - Introduced helpers.ts (ACTION_ICONS, actionColor, statusColor) and index export
  - Updated imports to use new subcomponents and services

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/328


## [0.0.5-alpha.202604121738.ec363779] - 2026-04-12

- ✨ Features: Introduced a new MCP Servers management UI with dialog-driven workflows
  - Added McpDialogs.tsx (AddServerDialog) and related dialogs module
  - Created McpServersManager with subcomponents: McpServersManager.tsx, McpServersTab.tsx, SkillsTab.tsx, and index.ts
  - Added shared types (McpServer, McpServerHealth, McpServerTool, RegistryServer, Skill, McpTemplate, McpTemplatesData) and re-export of SmartApp
  - Wire-up exports for new McpServersManager
- 🔧 Chores & Improvements: Major code refactor and UI expansion to support templates, skills, and tabbed interface

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/326


## [0.0.4-alpha.202604121402.09b13ece] - 2026-04-12

- 🔧 Chores & Improvements: Update MCP endpoint enabling logic to OR between file config and env config; endpoint 404 only when both sources disable. Tests updated accordingly.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/325


## [0.0.4-beta.202604120932.31b6b439] - 2026-04-12

- 🔧 Chores & Improvements: Update MCP endpoint enabling logic to use OR between file config and env config; endpoint now 404 only if both sources are disabled. Tests updated to reflect OR behavior and environment-variable handling.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/323



- 🔧 Chores & Improvements: Change MCP endpoint enabling logic to use OR between file config and env config; endpoint now 404 only when both sources are disabled
- 🐛 Bug Fixes: Update tests to reflect OR logic for MCP enabling; tests now expect 404 when both file-config and env-config are disabled
- 🔧 Chores & Improvements: Add environment-variable handling and test cleanup for MCP config logic

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/324


## [0.0.4-alpha.202604120909.30466170] - 2026-04-12

- ✨ Features: 
  - Backend MCP endpoint: switch to route-based tool registration (explicit MCP tool exposure)
  - Added backend test: backend/test/tool-registry-merge.test.ts for getMergedInputSchema regression (TypeBox)

- 🧪 Chores & Improvements:
  - Tests: switch config mocks to env-var-based config with explicit env setup; preserve singleton behavior
  - E2E: update package versions across apps and tests
  - Removed/cleaned Python MCP server test scaffolding and deprecated test structures

Note: No breaking changes detected.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/321


## [0.0.4-alpha.202604120851.2512256f] - 2026-04-12

- 🔧 Chores & Improvements: Version bumps across apps/tests to 0.0.4-alpha.202604120842.314f2bb8 and 0.0.4-alpha.202604112116.0c08004f
- 🔧 Chores & Improvements: Replace config mocks with env-vars-based config in tests to preserve singleton behavior
- 📚 Documentation: (No explicit docs changes)
- ⚠️ Breaking Changes: Backend MCP: refactor from registry-driven to route-based tool registration; more explicit MCP endpoint tests and removal of legacy Python MCP server test scaffolding

Note: Merge/update commits skipped; only meaningful changes included.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/320


## [0.0.4-alpha.202604112116.0c08004f] - 2026-04-12

- 🔧 Chores & Improvements: Refactor MCP backend to route-based tool registration (removing reliance on whole tool registry)
- 🔧 Chores & Improvements: Add extensive MCP endpoint integration tests (authentication, sessions, tools, protocol) via new backend/test/mcp-endpoint.test.ts
- 🗑️ Documentation / Maintenance: Remove legacy Python MCP server test scaffolding and deprecated test structure (pytest config, test utils, old test modules, and related files)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/319


## [0.0.4-alpha.202604112026.a30739f5] - 2026-04-11

- 🔧 Chores & Improvements: Refactor MCP endpoint to route-based tool registration (removes registry-driven exposure)  
- 🧪 🔧 Chores & Improvements: Large backend test suite added for MCP endpoint authentication, sessions, tools, and protocol compliance (with mocks)  
- 📚 Documentation: Removed unused Python MCP server test scaffolding and deprecated test structure (cleanup of old test config and files)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/318


## [0.0.4-alpha.202604111924.6ff9c348] - 2026-04-11

- 🔧 Chores & Improvements: Refactor MCP backend registration to route-based tool exposure (removes registry-driven dependency)
- 🔧 Chores & Improvements: Introduce extensive MCP endpoint test suite (integration tests for authentication, sessions, tools, protocol compliance)
- 🧪 🐛 Bug Fixes: Cleanup of legacy MCP server test scaffolding and deprecated test structure (removal of old Python test config and files)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/317


## [0.0.3-alpha.202604101244.fdcfb135] - 2026-04-10

- 🔧 Chores & Improvements: Update versioning to 0.0.3-alpha.202604101244.fdcfb135
- 📚 Documentation: Update CHANGELOG.md (PR #313)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/315


## [0.0.3-alpha.202604101219.41a64d4f] - 2026-04-10

- ✨ Features
  - SMART Apps: reorganized app structure and added new SMART App docs (consent-app, dtr-app, patient-portal, smart-dicom-template) with updated navigation.

- 🔧 Chores & Improvements
  - CI/CD: add permissions write for release-production workflow.
  - Monorepo path normalization: migrate UI app references from ui/ to apps/ui/ across codebase, docs, and configs.
  - Documentation: update docs sidebar and add SMART Apps docs.

- 🐛 Bug Fixes
  - Backend: expose ensurePostLogoutRedirectUris and add comprehensive tests for post-logout redirect URI behavior.

- 📚 Documentation
  - Documentation: add SMART App docs and update navigation.

- ⚠️ Breaking Changes
  - None identified.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/313


## [0.0.3-alpha.202604101213.09484d6c] - 2026-04-10

- ✨ Features
  - SMART Apps: new app sections and docs added (consent-app, dtr-app, patient-portal, smart-dicom-template) with updated navigation and docs sidebar
- 🔧 Chores & Improvements
  - Monorepo path normalization: migrate UI app references from ui/ to apps/ui/ across code, CI/CD, Dockerfiles, and configs
  - Align package versions across apps to 0.0.3-alpha.202604101133.7e6bdcf3
  - GitHub Actions: grant write permission for packages in release workflow
  - Documentation: added SMART App docs and updated docs sidebar
- 🐛 Bug Fixes
  - Backend: expose ensurePostLogoutRedirectUris and add comprehensive tests for post-logout redirect URI behavior
- 📚 Documentation
  - README: remove deprecated AI assistant table; update references to new app structure
- ⚠️ Breaking Changes
  - None identified

If you want more granular grouping or emphasis, I can adjust.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/311


## [0.0.3-alpha.202604101128.7fdbfc46] - 2026-04-10

- ✨ Features
  - None

- 🐛 Bug Fixes
  - Expose ensurePostLogoutRedirectUris helper and add tests for post-logout redirect URI behavior (creation, update, startup repair) with mocks for token validation and admin calls.

- 📚 Documentation
  - None

- 🔧 Chores & Improvements
  - CI/CD: Add GitHub Actions permissions level for packages in release-production workflow.
  - Repo/Codebase hygiene: Major workspace path refactor—rename ui/ to apps/ui/ across configs, Dockerfiles, and type/script references; update API client models to align with new app paths; adjust build and lint configurations accordingly.

- ⚠️ Breaking Changes
  - None

Note: Filtered out update/merge/metadata commits per guidelines.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/309


## [0.0.3-alpha.202604101119.fb892148] - 2026-04-10

- 🔧 Chores & Improvements: Major refactor of workspace paths and UI app references (ui/ → apps/ui/), updated CI/CD/build configs, Dockerfiles, and TypeScript configs to reflect new monorepo structure
- 🔧 Chores & Improvements: API client scaffolding moved/generated under apps/ui/lib/api-client (from ui/), enabling UI API interactions
- 🧪 Features: Expose ensurePostLogoutRedirectUris from backend init for external usage
- 🧪 Features: New tests for post-logout redirect URI behavior (creation, update, startup repair) with mocks and state tracking

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/308


## [0.0.3-alpha.202604092223.826788c7] - 2026-04-10

- 🔧 Chores & Improvements: Expose ensurePostLogoutRedirectUris in backend/init.ts and add comprehensive tests for post-logout redirect URI behavior (creation, update, startup repair) with mocks for token validation and Keycloak admin interactions

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/306



- ✨ Features: Expose ensurePostLogoutRedirectUris and add comprehensive tests for post-logout redirect URI behavior (creation, update, startup repair) with mocks.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/307


## [0.0.3-beta.202604091636.12e24ecc] - 2026-04-09

- ✨ Features: Expose ensurePostLogoutRedirectUris in backend/src/init.ts; add comprehensive tests for post-logout redirect URI behavior (creation, update, startup repair) with token validation and Keycloak mocks.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/304



- 🔧 Chores & Improvements: Expose ensurePostLogoutRedirectUris from backend/init.ts and add comprehensive tests for post-logout redirect URI behavior (creation, update, startup repair) with mocks for token validation and Keycloak interactions

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/305


## [0.0.3-alpha.202604090837.7f0be1bf] - 2026-04-09

- 🔧 Chores & Improvements: CI/CD tweaks and testing updates
  - ci: add [skip ci] to version-bump commits to prevent duplicate workflow runs
  - chore(testing): update beta SMART compliance report
  - chore(testing): update dev SMART compliance report
- 📚 Documentation: docs for DICOMweb proxy & Patient Portal Imaging
- ⚠️ Breaking Changes: none
- ✨ Features: none
- 🐛 Bug Fixes: none

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/302


## [0.0.3-alpha.202604090747.47995eb3] - 2026-04-09

- ✨ Features: add post.logout.redirect.uris for Keycloak 25+ compatibility
- 🔧 Chores & Improvements: CI/testing updates and version bumps
- 📚 Documentation: changelog entry updated for PR #300

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/301


## [0.0.3-alpha.202604090735.37497a36] - 2026-04-09

- 🔧 Chores & Improvements: internal setup and maintenance
  - fix: use internal.setOptions for dicom-image-loader auth config (quotentiroler)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/300


## [0.0.3-alpha.202604090720.61696ba9] - 2026-04-09

- ✨ Features: Add DicomViewer component with Cornerstone3D lazy init, WADO-RS auth integration, dynamic imports, and image loader token injection; extend ImagingStudyCard to support quick-view via DicomViewer
- 🔧 Chores & Improvements: Expand dicomweb.ts with helpers (getAccessToken, buildImageId, fetchSeriesImageIds) for building Cornerstone imageIds; update patient-portal package.json with new dependencies and devDependency; adjust vite.config.ts to include viteCommonjs plugin and optimizeDeps updates
- ⚠️ Breaking Changes: None detected
- 📚 Documentation: None detected
- 🐛 Bug Fixes: None detected

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/299


## [0.0.3-alpha.202604080110.a6a53b7c] - 2026-04-09

- 🔧 Chores & Improvements: Add key_ops: ["sign"] to RS384 private JWKS entries (dev and alpha)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/297


## [0.0.3-alpha.202604080058.cda7f4b7] - 2026-04-08

- ✨ Features
  - None

- 🐛 Bug Fixes
  - fix: convert Union([Literal(...)]) to UnionEnum for MCP compatibility

- 📚 Documentation
  - docs: update CHANGELOG.md for PR #295
  - docs: update CHANGELOG.md for PR #294
  - docs: update CHANGELOG.md for PR #293

- 🔧 Chores & Improvements
  - fix: introspection patient claim + backend services JWKS format
  - fix: fix dtr-app tgz (stale cache) and move PASClaimResponse to main import
  - Update version to 0.0.3-alpha.202604080058.cda7f4b7

- ⚠️ Breaking Changes
  - None

- Note: Skipped non-meaningful or duplicate commits (update, merge, metadata, CI-only).

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/296


## [0.0.3-beta.202604072243.17a845f3] - 2026-04-07

- 🔧 Chores & Improvements: CI/CD updates and maintenance (version bump in CI, testing report updates)
- 🐛 Bug Fixes: Fix dtr-app tarball cache and adjust PASClaimResponse import
- 📚 Documentation: Update CHANGELOG entry for PR #293

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/294



- ✨ Features
  - None

- 🐛 Bug Fixes
  - fix: introspection patient claim + backend services JWKS format (quotentiroler)
  - fix: fix dtr-app tgz (stale cache) and move PASClaimResponse to main import (quotentiroler)

- 📚 Documentation
  - docs: update CHANGELOG.md for PR #294
  - docs: update CHANGELOG.md for PR #293

- 🔧 Chores & Improvements
  - chore(testing): update beta/dev SMART compliance reports (proxy-smart-releaser[bot])
  - chore(testing): update version to 0.0.3-beta.202604072243.17a845f3 (beta) (github-actions[bot])

- ⚠️ Breaking Changes
  - None

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/295


## [0.0.3-alpha.202604072243.17a845f3] - 2026-04-07

- ⚠️ Breaking Changes: none
- ✨ Features: none
- 🐛 Bug Fixes: none
- 📚 Documentation: none
- 🔧 Chores & Improvements: minor build/test tooling updates

Note: No user-facing changes detected beyond version bumps and internal maintenance.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/293


## [0.0.3-alpha.202604072226.d14c7f94] - 2026-04-07

- 🔧 Chores & Improvements: Regenerate FHIR tgz packages with babelfhir-ts 1.2.5; update testing reports
- 📚 Documentation: Update CHANGELOG.md for PR #291

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/292


## [0.0.3-alpha.202604072220.eb426fd8] - 2026-04-07

- 🔧 Chores & Improvements: Update dependencies and bump version strings across bun.lock and multiple packages to 202604072212.97a1f997
  - Added dependency "@vue/server-renderer" ^3.5.30
  - Updated package.json and bun.lock version tags for backend, infra, patient-portal, and ui components

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/291


## [0.0.3-alpha.202604072212.97a1f997] - 2026-04-07

- 🔧 Chores & Improvements: Drop .js from valueset imports to align with exports wildcard (quotentiroler)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/290


## [0.0.3-beta.202604072115.7fa57ae1] - 2026-04-07

- 🔧 Chores & Improvements: Internal maintenance (version metadata updates skipped; exclude noisy update commits)
- ✨ Features: None
- 🐛 Bug Fixes: fix(patient-portal): regenerate ips-generated with babelfhir-ts 1.2.5 (valuesets exports)
- 📚 Documentation: docs: update CHANGELOG.md for PR #288
- ⚠️ Breaking Changes: None

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/289


## [0.0.3-alpha.202604071925.75928c50] - 2026-04-07

- 🔧 Chores & Improvements: Internal updates and maintenance
  - Minor: Update CHANGELOG for PR #287
  - Chore: Update version metadata and related release steps to alpha 0.0.3-alpha.202604071925.75928c50
  - Chore: Update dev beta/alpha SMART compliance reports (cleanup/internal)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/288


## [0.0.3-alpha.202604071628.96af1239] - 2026-04-07

- 🔧 Chores & Improvements: Remove explicit GHCR build/push workflow step for alpha; retain automatic Northflank deployment on develop pushes; reduce top-level permissions by removing write access from certain packages.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/287


## [0.0.3-alpha.202604071618.6e486c97] - 2026-04-07

- 🔧 Chores & Improvements: Copy root lib/ tarballs into Docker build context

- 📚 Documentation: Update CHANGELOG.md for PR #284

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/285


## [0.0.3-alpha.202604071545.70936f2d] - 2026-04-07

- 🔧 Chores & Improvements: CI/CD workflow enhancements
  - Add GitHub Actions steps to build and push the alpha Docker image to GHCR, extend workflow permissions (packages: write)
  - Introduce build-alpha-image job: checkout develop, login to GHCR, setup Buildx, compute image prefix, build/push mono:alpha-<version> and mono:alpha-latest, enable caching for alpha-mono

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/284


## [0.0.3-alpha.202604071536.80de429f] - 2026-04-07

- ✨ Features:  
  - Add CI/CD workflow to build and push beta Docker images to GHCR (backend and frontend) with versioned and latest tags, plus Buildx caching.  
  - Introduce GHCR-based image usage in docker-compose.beta.yml for backend, frontend, and Keycloak (default to beta-latest tags).

- 🔧 Chores & Improvements:  
  - Implement isolated dependency install layer for mono build with per-package workspace installation and cached bun install.  
  - Compute and export lowercase GHCR path (IMAGE_PREFIX) at two workflow points to ensure consistent image references.  
  - Update GitHub Actions workflow permissions to grant write access to release packaging.

- ⚠️ Breaking Changes:  
  - Switched docker-compose.beta.yml to use prebuilt GHCR images instead of local Docker builds.

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/283


## [0.0.3-beta.202604070736.41e900cf] - 2026-04-07

- 🔧 Chores & Improvements: CI/CD updates
  - Add GitHub Actions workflow to build and push beta Docker images to GHCR (backend and frontend) with versioned and latest tags, plus Buildx caching
  - Update docker-compose.beta.yml to use GHCR prebuilt images via env vars (BACKEND_IMAGE, FRONTEND_IMAGE, KEYCLOAK_IMAGE) with defaults to beta-latest; remove local Docker builds for Keycloak, Backend, and Frontend

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/280



- 🔧 Chores & Improvements: Ensure IMAGE_PREFIX is always lowercase GHCR path at runtime (two build/deploy steps) and remove the old definition
- 🔧 Chores & Improvements: Update GitHub Actions to grant package write access in release-beta workflow
- ✨ Features: Add beta GitHub Actions workflow to build and push beta Docker images to GHCR (backend and frontend) with versioned and latest tags, plus Buildx caching
- 🔧 Chores & Improvements: Switch docker-compose.beta.yml to use prebuilt GHCR images (BACKEND_IMAGE, FRONTEND_IMAGE, KEYCLOAK_IMAGE) with default beta-latest tags; remove local builds for Keycloak, Backend, and Frontend

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/282


## [0.0.3-alpha.202604070736.41e900cf] - 2026-04-07

- 🐛 Bug Fixes: Health checks treat unconfigured subsystems as neutral
  - Not_configured state added for FHIR when no servers configured
  - Keycloak health: if KEYCLOAK_BASE_URL missing, report not_configured (not unhealthy)
  - Overall system health now filters out not_configured subsystems and reports healthy/degraded/unhealthy accurately
- 🔧 Chores & Improvements: Use JAVA_TOOL_OPTIONS for Keycloak build heap limit (JVM-level) instead of JAVA_OPTS_KC_BUILD

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/279


## [0.0.3-beta.202604070709.d55c0d66] - 2026-04-07

- 🔧 Chores & Improvements: Internal updates and maintenance
- ⚠️ Breaking Changes: None
- ✨ Features: None
- 🐛 Bug Fixes: None
- 📚 Documentation: None

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/278


## [0.0.3-alpha.202604070601.47816146] - 2026-04-07

- ✨ Features: integrate remaining babelfhir-ts IPS/PAS types across both apps (quotentiroler)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/276


## [0.0.3-alpha.202604070519.fa24d1e7] - 2026-04-07

- ✨ Features: integrate babelfhir-ts 1.2.2 PAS/IPS types into dtr-app and patient-portal
- 🔧 Chores & Improvements: update dev SMART compliance report
- 🔧 Chores & Improvements: internal version metadata updates (CI/CD)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/275


## [0.0.3-alpha.202604070510.aa1fb797] - 2026-04-07

- ✨ Features: None
- 🐛 Bug Fixes:
  - fix: add date-fns@1.30.1 as direct backend dependency to fix Bun linker bug
- 📚 Documentation:
  - docs: update CHANGELOG.md for PR #273
- 🔧 Chores & Improvements:
  - chore(testing): update dev SMART compliance report
  - Update version to 0.0.3-alpha.202604070510.aa1fb797 (alpha)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/274


## [0.0.3-alpha.202604070454.f050a94b] - 2026-04-07

- ✨ Features: Integrate TaskStatusCode, TaskIntentCode, and BundleTypeCode across consent-app and backend (quotentiroler)
- 🔧 Chores & Improvements: Update changelog reference and version metadata
- ⚠️ Breaking Changes: None
- 📚 Documentation: None
- 🐛 Bug Fixes: None

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/273


## [0.0.3-alpha.202604070450.422fa383] - 2026-04-07

- ✨ Features: use extension validators and ValueSet codes in brand-bundle (quotentiroler)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/272


## [0.0.3-alpha.202604070423.c1b1db1c] - 2026-04-07

- 🔧 Chores & Improvements: Significant dependency lockfile updates and prebuilt binary refresh
  - Substantial Bun.lock churn with widespread dependency/version updates
  - Updated prebuilt artifact: hl7.fhir.uv.smart-app-launch-generated.tgz

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/271


## [0.0.3-alpha.202603270523.8a72cdae] - 2026-03-27

- ✨ Features: add Proxy Smart logo icon to /apps page nav
- 🔧 Chores & Improvements: update beta/alpha version references for pre-release 0.0.3-alpha.202603270523.8a72cdae
- 📚 Documentation: update CHANGELOG.md for PR #269

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/270


## [0.0.3-alpha.202603270508.c9253829] - 2026-03-27

- 🐛 Bug Fixes: Show App Store only when user is signed out
- 🔧 Chores & Improvements: CI/CD and testing updates (dev SMART compliance report)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/269


## [0.0.3-alpha.202603270447.2f9c80a0] - 2026-03-27

- 🔧 Chores & Improvements: Internal maintenance and refactoring
  - Refactor(shared-ui): extract AppHeader component from app headers
  - CI/CD: Update version to 0.0.3-alpha.202603270447.2f9c80a0 (alpha)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/268


## [0.0.3-alpha.202603270441.5b5ab954] - 2026-03-27

- 🔧 Chores & Improvements: Internal maintenance updates and CI/CD housekeeping
- ✨ Features: None
- 🐛 Bug Fixes: Restore useMemo import in consent-app
- 📚 Documentation: Update CHANGELOG.md for PR #266
- ⚠️ Breaking Changes: None

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/267


## [0.0.3-alpha.202603270436.f1547658] - 2026-03-27

- 🔧 Chores & Improvements: Refactor access request logic to use primitive mode helpers (modeBy, modeKey) for stable dependencies
  - Remove react useMemo import from useAccessRequests.ts
  - Guard fetchRequests with modeBy/modeKey instead of mode
  - Switch searchTasksByPatient/searchTasksByRequester to modeBy/modeKey
  - Update effect dependencies to [modeBy, modeKey] and remove direct [mode]

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/266


## [0.0.3-alpha.202603270407.6aa704dc] - 2026-03-27

- ✨ Features: expose MCP resources (GET routes) in admin endpoint config UI (quotentiroler)
- 🔧 Chores & Improvements: update beta/alpha version metadata and SMART compliance reports (ci-related)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/265


## [0.0.3-alpha.202603270356.21873b4b] - 2026-03-27

- ✨ Features: add agent scope context and Device fhirUser support (quotentiroler)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/264


## [0.0.3-alpha.202603270335.6642cc28] - 2026-03-27

- 🔧 Chores & Improvements: Consolidate OAuth & Events into a single OAuth tab; fix memory stats
- 🔧 Chores & Improvements: Update beta/dev SMART compliance reports (internal testing automation)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/263


## [0.0.3-alpha.202603270323.2babb9a9] - 2026-03-27

- ✨ Features: replace static 429 stat card with dynamic Top Error card (quotentiroler)
- 🔧 Chores & Improvements: update dev SMART compliance report (proxy-smart-releaser[bot])

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/262


## [0.0.3-alpha.202603270307.b7318334] - 2026-03-27

- 🔧 Chores & Improvements: use generated API client types instead of manual duplicates (quotentiroler)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/261


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
