import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./test/setup.ts'],
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'json-summary', 'html'],
        exclude: [
          'node_modules/',
          'test/',
          'dist/',
          '**/*.d.ts',
          'vite.config.ts',
          'vitest.config.ts',
          'src/lib/api-client/**', // Generated API client
          '**/*.test.{ts,tsx}',
          '**/*.spec.{ts,tsx}'
        ],
        thresholds: {
          global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
          }
        }
      }
    }
  })
)
