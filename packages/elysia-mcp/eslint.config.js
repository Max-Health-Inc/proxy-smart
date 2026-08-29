/**
 * @proxy-smart/elysia-mcp ESLint config — extends the shared Node base config.
 *
 * Previously absent, which made `eslint .` fail with "all files ignored"
 * (no flat config resolved for the package). This wires the package into the
 * shared `@proxy-smart/eslint-config` base like every other workspace package.
 */
import { defineConfig } from 'eslint/config'
import { baseConfig } from '../../config/eslint/base.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(
  ...baseConfig({
    tsconfigRootDir: __dirname,
  }),
)
