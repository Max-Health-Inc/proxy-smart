import { createSmartViteConfig } from '../../shared-ui/vite-config'

export default createSmartViteConfig(
  { base: '/apps/dtr/', port: 5175 },
  __dirname,
)
