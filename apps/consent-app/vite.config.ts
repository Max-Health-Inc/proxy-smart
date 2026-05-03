import { createSmartViteConfig } from '../../config/vite-config'

export default createSmartViteConfig(
  { base: '/apps/consent/', port: 5174 },
  __dirname,
)
