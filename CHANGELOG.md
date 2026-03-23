# Changelog

All notable changes to Proxy Smart will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
