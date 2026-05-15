/**
 * Shared Vite configuration factory for SMART-on-FHIR apps.
 *
 * Usage in each app's vite.config.ts:
 * ```ts
 * import { createSmartViteConfig } from '../../config/vite-config'
 * export default createSmartViteConfig({ base: '/apps/my-app/', port: 5174 })
 * ```
 */
import { defineConfig, type UserConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export interface SmartViteOptions {
  /** Base URL path, e.g. '/apps/patient-portal/' */
  base: string
  /** Dev server port */
  port: number
  /** Extra Vite plugins to append */
  plugins?: UserConfig['plugins']
  /** Extra optimizeDeps config */
  optimizeDeps?: UserConfig['optimizeDeps']
  /** Extra worker config */
  worker?: UserConfig['worker']
}

export function createSmartViteConfig(
  opts: SmartViteOptions,
  /** Absolute __dirname of the consuming app */
  appDir: string,
) {
  return defineConfig({
    base: opts.base,
    plugins: [react(), tailwindcss(), ...(opts.plugins ?? [])],
    server: {
      port: opts.port,
    },
    resolve: {
      alias: {
        '@': path.resolve(appDir, './src'),
      },
    },
    ...(opts.optimizeDeps ? { optimizeDeps: opts.optimizeDeps } : {}),
    ...(opts.worker ? { worker: opts.worker } : {}),
    build: {
      sourcemap: false,
      reportCompressedSize: false,
    },
  })
}
