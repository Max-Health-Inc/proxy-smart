import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import type { RollupLog, LoggingFunction } from 'rollup'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    // No proxy needed - all API calls use VITE_API_BASE_URL
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Use esbuild for faster minification (3-4x faster than terser)
    minify: 'esbuild',
    // Disable source maps for faster builds
    sourcemap: false,
  // Target 200-600 kB chunks; warn once we exceed 600 kB
  chunkSizeWarningLimit: 800,
    // Don't report compressed size (saves ~1-2s on large projects)
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          const normalizedId = id.replace(/\\/g, '/');

          if (normalizedId.includes('/api-client/')) {
            return 'api-client';
          }

          const chunkGroups = [
            {
              name: 'vendor-core',
              patterns: [
                'node_modules/react',
                'node_modules/react-dom',
                'node_modules/react-router',
                'node_modules/react-query',
                'node_modules/@tanstack',
                'node_modules/zustand',
                'node_modules/valtio',
                'node_modules/swr'
              ]
            },
            {
              name: 'vendor-ui',
              patterns: [
                'node_modules/@radix-ui',
                'node_modules/lucide-react',
                'node_modules/@floating-ui'
              ]
            },
            {
              name: 'vendor-visualization',
              patterns: [
                'node_modules/recharts',
                'node_modules/chart.js',
                'node_modules/d3'
              ]
            },
            {
              name: 'vendor-infra',
              patterns: [
                'node_modules/i18next',
                'node_modules/react-i18next',
                'node_modules/date-fns',
                'node_modules/clsx',
                'node_modules/tailwind-merge',
                'node_modules/crypto-js',
                'node_modules/jwt-decode'
              ]
            }
          ];

          for (const group of chunkGroups) {
            if (group.patterns.some((pattern) => normalizedId.includes(pattern))) {
              return group.name;
            }
          }

          return undefined;
        },
      },
      // Suppress specific warnings we can't fix (third-party library issues)
      onwarn(warning: RollupLog, warn: LoggingFunction) {
        // Suppress eval warnings from onnxruntime-web (third-party minified code)
        if (warning.code === 'EVAL' && warning.id?.includes('onnxruntime-web')) {
          return;
        }
        warn(warning);
      }
    }
  }
})
