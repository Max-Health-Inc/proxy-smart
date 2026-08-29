import { config } from "@/config"
import { SmartAuth } from "@max-health-inc/fhir-ips/fhir-client"
import { createSmartAuth } from "@proxy-smart/shared-ui"

export const { smartAuth, fhirBaseUrl } = createSmartAuth({
  config,
  SmartAuth,
  storagePrefix: "smart_dicom_template_",
})
