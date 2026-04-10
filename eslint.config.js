import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(
  // Global ignores
  { 
    ignores: [
      'dist/**',
      'node_modules/**',
      'backend/dist/**',
      'apps/ui/dist/**',
      '**/lib/api-client/**',
      '**/*.generated.*',
      'coverage/**'
    ] 
  },
  
  // Root level config for shared files
  {
    files: ['*.{js,ts,mjs}'], // Root level config files
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
      parserOptions: {
        tsconfigRootDir: __dirname
      }
    },
    rules: {
      "no-console": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    },
  }
)
