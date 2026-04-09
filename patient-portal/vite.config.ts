import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import path from 'path'

export default defineConfig({
  base: '/apps/patient-portal/',
  plugins: [react(), tailwindcss(), viteCommonjs()],
  server: {
    port: 5176,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@proxy-smart/shared-ui': path.resolve(__dirname, '../shared-ui/src'),
    },
  },
  optimizeDeps: {
    exclude: ['@cornerstonejs/dicom-image-loader'],
    include: ['dicom-parser'],
  },
  worker: {
    format: 'es' as const,
  },
  build: {
    sourcemap: false,
    reportCompressedSize: false,
  },
})
