import { createSmartViteConfig } from '../../config/vite-config'

export default createSmartViteConfig(
  { base: '/patient-picker/', port: 5176 },
  __dirname,
)
