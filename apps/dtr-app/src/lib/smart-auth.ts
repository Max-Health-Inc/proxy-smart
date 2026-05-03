import { config } from "@/config"
import { SmartAuth } from "hl7.fhir.us.davinci-dtr-generated/fhir-client"
import { createSmartAuth } from "@max-health-inc/shared-ui"

export const { smartAuth, fhirBaseUrl } = createSmartAuth({
  config,
  SmartAuth,
  storagePrefix: "dtr_app_",
})
