/**
 * Root-level ESLint config — only applies to root scripts/config files.
 */
import { defineConfig } from 'eslint/config'
import { baseConfig } from './eslint-config/base.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(
  ...baseConfig({
    tsconfigRootDir: __dirname,
    files: ['*.{js,ts,mjs}'],
    ignores: [
      'backend/**',
      'apps/**',
      'infra/**',
      'shared-ui/**',
      'coverage/**',
      '**/*.generated.*',
    ],
  }),
)
