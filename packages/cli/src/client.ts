/**
 * Wires the generated OpenAPI client to a CLI session.
 *
 * The generated `Configuration` accepts an `accessToken` callback that the
 * client invokes for every request, so we delegate straight to the session.
 * That means each API call lazily obtains (and transparently refreshes) a
 * valid bearer token without the command handlers worrying about it.
 */
import {
  Configuration,
  SmartAppsApi,
  HealthcareUsersApi,
  ScopeSetsApi,
  McpManagementApi,
  AdminApi,
} from './api-client'
import { type ResolvedConfig } from './config'
import { type Session } from './session'

/** All the generated admin API surfaces the CLI drives, sharing one config. */
export interface ApiClient {
  smartApps: SmartAppsApi
  healthcareUsers: HealthcareUsersApi
  scopeSets: ScopeSetsApi
  mcp: McpManagementApi
  admin: AdminApi
  /** The proxy base URL these APIs are bound to. */
  basePath: string
}

/**
 * Build an authenticated API client bound to the resolved proxy URL.
 * The bearer token is resolved per-request via the session.
 */
export function createApiClient(config: ResolvedConfig, session: Session): ApiClient {
  const configuration = new Configuration({
    basePath: config.url,
    accessToken: () => session.getAccessToken(),
  })
  return {
    smartApps: new SmartAppsApi(configuration),
    healthcareUsers: new HealthcareUsersApi(configuration),
    scopeSets: new ScopeSetsApi(configuration),
    mcp: new McpManagementApi(configuration),
    admin: new AdminApi(configuration),
    basePath: config.url,
  }
}
