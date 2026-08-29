/**
 * Proxy Smart CLI ESLint config — extends the shared Node base config.
 *
 * The generated OpenAPI client under src/api-client/ is excluded: it is
 * produced verbatim by `openapi-ts-fetch` (see the `generate` script) and
 * carries its own `/* eslint-disable *\/` banner, so we never hand-lint it.
 */
import { defineConfig } from 'eslint/config'
import { baseConfig } from '../../config/eslint/base.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(
  ...baseConfig({
    tsconfigRootDir: __dirname,
    ignores: ['src/api-client/**'],
  }),
)
