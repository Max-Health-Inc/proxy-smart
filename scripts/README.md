# Scripts

Utility scripts for the Proxy Smart project.

## Build & Deployment

- `version.js` - Version management utilities
- `copy-ui-dist.js` - Copies UI build to backend public folder
- `setup-hooks.js` - Git hooks setup

## Development

- `extract-schemas.py` - Extract TypeScript schemas
- `count-targets.py` - Count implementation targets

## Workflow Scripts

The `workflows/` folder contains Python scripts used by GitHub Actions:

- `summarize_diff.py` - AI-powered commit diff summaries (GPT-5 nano)
- `generate_changelog_ai.py` - AI-powered changelog generation from commits
- `categorize_commits.py` - Fallback commit categorization (no AI required)

## AI Pipeline (Experimental)

The `ai-pipeline/` folder contains experimental AI-assisted code analysis and fix proposal tooling. See [ai-pipeline/README.md](ai-pipeline/README.md) for details.
