import { createSmartAppConfig } from '@max-health-inc/shared-ui'

export const config = createSmartAppConfig({
  clientId: 'consent-app',
  scopes: 'openid fhirUser patient/*.*',
})
