import { createSmartAppConfig } from '@max-health-inc/shared-ui'

export const config = createSmartAppConfig({
  clientId: 'dtr-app',
  scopes: 'openid fhirUser launch user/*.read patient/*.read user/Claim.cud user/QuestionnaireResponse.cud',
})
