# Changelog

All notable changes to Proxy Smart will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.0.2-beta.202603231957.d98e9bfd] - 2026-03-23

- 🔧 Chores & Improvements: Remove committed app bundles with baked localhost URLs (quotentiroler)

**Full Changelog**: https://github.com/Max-Health-Inc/proxy-smart/pull/219


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
