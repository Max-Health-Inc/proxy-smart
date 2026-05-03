import { createSmartViteConfig } from '../../shared-ui/vite-config'

export default createSmartViteConfig(
  { base: '/apps/patient-picker/', port: 5176 },
  __dirname,
)
