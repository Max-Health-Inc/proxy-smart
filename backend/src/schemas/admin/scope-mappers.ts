import { t, type Static } from 'elysia'

/**
 * SMART Scope Protocol Mapper schemas
 */

export const ScopeMapperEntry = t.Object({
  id: t.Optional(t.String({ description: 'Keycloak mapper ID' })),
  name: t.String({ description: 'Mapper name' }),
  claimName: t.String({ description: 'Token claim name' }),
  userAttribute: t.String({ description: 'User attribute source' }),
  accessTokenClaim: t.Boolean({ description: 'Include in access token' }),
  idTokenClaim: t.Boolean({ description: 'Include in ID token' }),
  userinfoTokenClaim: t.Boolean({ description: 'Include in userinfo' })
}, { title: 'ScopeMapperEntry' })

export const ScopeMapperInfo = t.Object({
  scopeId: t.String({ description: 'Keycloak client scope ID' }),
  scopeName: t.String({ description: 'Scope name (e.g. launch/patient)' }),
  mappers: t.Array(ScopeMapperEntry, { description: 'Existing protocol mappers' }),
  missingMappers: t.Array(t.String(), { description: 'Names of required mappers that are missing' }),
  healthy: t.Boolean({ description: 'Whether all required mappers are present' })
}, { title: 'ScopeMapperInfo' })

export const ScopeMapperStatusResponse = t.Object({
  status: t.Array(ScopeMapperInfo),
  timestamp: t.String()
}, { title: 'ScopeMapperStatusResponse' })

export const ScopeMapperFixResponse = t.Object({
  message: t.String(),
  scanned: t.Number({ description: 'Number of scopes scanned' }),
  created: t.Number({ description: 'Number of mappers created' }),
  errors: t.Array(t.String(), { description: 'Any errors encountered' }),
  timestamp: t.String()
}, { title: 'ScopeMapperFixResponse' })

export type ScopeMapperInfoType = Static<typeof ScopeMapperInfo>
export type ScopeMapperStatusResponseType = Static<typeof ScopeMapperStatusResponse>
export type ScopeMapperFixResponseType = Static<typeof ScopeMapperFixResponse>
