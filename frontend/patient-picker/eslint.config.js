/**
 * Patient Picker ESLint config — extends shared React config.
 */
import { defineConfig } from 'eslint/config'
import { reactConfig } from '../../eslint-config/react.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(
  ...reactConfig({ tsconfigRootDir: __dirname }),
)
