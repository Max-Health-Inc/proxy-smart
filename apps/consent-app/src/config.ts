import { createSmartAppConfig } from '@proxy-smart/shared-ui'

export const config = createSmartAppConfig({
  clientId: 'consent-app',
  scopes: 'openid fhirUser patient/*.*',
})
