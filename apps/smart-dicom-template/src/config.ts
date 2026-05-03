import { createSmartAppConfig } from '@max-health-inc/shared-ui'

export const config = createSmartAppConfig({
  clientId: 'smart-dicom-template',
  scopes: 'openid fhirUser patient/ImagingStudy.read patient/DiagnosticReport.write',
})
