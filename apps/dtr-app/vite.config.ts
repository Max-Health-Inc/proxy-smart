import { createSmartViteConfig } from '../../config/vite-config'

export default createSmartViteConfig(
  { base: '/apps/dtr/', port: 5175 },
  __dirname,
)
