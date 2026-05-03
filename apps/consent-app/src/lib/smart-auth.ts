import { config } from "@/config"
import { SmartAuth } from "@babelfhir-ts/client-r4"
import { createSmartAuth } from "@max-health-inc/shared-ui"

export const { smartAuth, fhirBaseUrl } = createSmartAuth({
  config,
  SmartAuth,
  storagePrefix: "consent_app_",
})
