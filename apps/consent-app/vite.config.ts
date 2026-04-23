import { createSmartViteConfig } from '../../shared-ui/vite-config'

export default createSmartViteConfig(
  { base: '/apps/consent/', port: 5174 },
  __dirname,
)
