import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import { createSmartViteConfig } from '../../config/vite-config'

export default createSmartViteConfig(
  {
    base: '/apps/smart-dicom-template/',
    port: 5180,
    plugins: [viteCommonjs()],
    optimizeDeps: {
      exclude: ['@cornerstonejs/dicom-image-loader'],
      include: ['dicom-parser'],
    },
    worker: {
      format: 'es' as const,
    },
  },
  __dirname,
)
