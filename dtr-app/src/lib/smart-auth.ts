import { config } from "@/config"
import { SmartAuth } from "hl7.fhir.us.davinci-pas-generated/fhir-client"

export const fhirBaseUrl = `${config.proxyBase}/${config.proxyPrefix}/${config.fhirServerId}/${config.fhirVersion}`

export const smartAuth = new SmartAuth({
  clientId: config.clientId,
  redirectUri: config.redirectUri,
  fhirBaseUrl,
  scopes: config.scopes,
  storagePrefix: "dtr_app_",
})
