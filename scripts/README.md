# Scripts

Utility scripts for the Proxy Smart project.

## Build & Deployment

- `version.js` - Version management utilities
- `copy-ui-dist.js` - Copies UI build to backend public folder
- `setup-hooks.js` - Git hooks setup

## Development

- `extract-schemas.py` - Extract TypeScript schemas
- `count-targets.py` - Count implementation targets
- `spdx.mjs` - Add/verify per-file SPDX license headers

## Licensing (SPDX / REUSE)

The repo is dual-licensed (`AGPL-3.0-or-later OR LicenseRef-Commercial`) and is
[REUSE](https://reuse.software)-compliant via the catch-all in `REUSE.toml`, so
compliance never depends on every file having a header. Per-file headers are
added incrementally:

- `bun run spdx:add` - add SPDX headers to staged source files
- `bun run spdx:check` - fail if any staged source file lacks a header
- `bun run reuse:lint` - full REUSE check (needs the `reuse` CLI; CI runs it)

The header identifier and copyright are read from `REUSE.toml` (single source of
truth), so they are never hardcoded in the script. Header format:

```
// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial
```

## Workflow Scripts

The `workflows/` folder contains Python scripts used by GitHub Actions:

- `summarize_diff.py` - AI-powered commit diff summaries (GPT-5 nano)
- `generate_changelog_ai.py` - AI-powered changelog generation from commits
- `categorize_commits.py` - Fallback commit categorization (no AI required)

## AI Pipeline (Experimental)

The `ai-pipeline/` folder contains experimental AI-assisted code analysis and fix proposal tooling. See [ai-pipeline/README.md](ai-pipeline/README.md) for details.
