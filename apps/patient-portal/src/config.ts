import { createSmartAppConfig } from '@max-health-inc/shared-ui'

export const config = createSmartAppConfig({
  clientId: 'patient-portal',
  scopes: 'openid fhirUser launch/patient patient/*.read patient/*.write',
})
