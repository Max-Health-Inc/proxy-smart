import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  base: '/apps/consent/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@proxy-smart/shared-ui': path.resolve(__dirname, '../shared-ui/src'),
    },
  },
  build: {
    sourcemap: false,
    reportCompressedSize: false,
  },
})
