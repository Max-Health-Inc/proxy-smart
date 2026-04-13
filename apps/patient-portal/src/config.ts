import { createSmartAppConfig } from '@proxy-smart/shared-ui'

export const config = createSmartAppConfig({
  clientId: 'patient-portal',
  scopes: 'openid fhirUser patient/*.read patient/*.write',
})
