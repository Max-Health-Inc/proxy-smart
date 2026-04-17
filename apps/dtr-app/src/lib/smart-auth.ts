import { config } from "@/config"
import { SmartAuth } from "hl7.fhir.us.davinci-dtr-generated/fhir-client"

export const fhirBaseUrl = `${config.proxyBase}/${config.proxyPrefix}/${config.fhirServerId}/${config.fhirVersion}`

export const smartAuth = new SmartAuth({
  clientId: config.clientId,
  redirectUri: config.redirectUri,
  postLogoutRedirectUri: window.location.origin + import.meta.env.BASE_URL,
  fhirBaseUrl,
  scopes: config.scopes,
  storagePrefix: "dtr_app_",
})
