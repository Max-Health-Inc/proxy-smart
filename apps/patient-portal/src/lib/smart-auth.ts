import { config } from "@/config"
import { SmartAuth } from "hl7.fhir.uv.ips-generated/fhir-client"
import { createSmartAuth } from "@max-health-inc/shared-ui"

export const { smartAuth, fhirBaseUrl } = createSmartAuth({
  config,
  SmartAuth,
  storagePrefix: "patient_portal_",
})
