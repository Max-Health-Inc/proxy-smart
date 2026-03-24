/**
 * Runtime Configuration Store
 * 
 * In-memory config store backed by Keycloak realm attributes.
 * Settings saved via admin UI are persisted to Keycloak and cached here.
 * getConsentConfig() and getIalConfig() read from this store,
 * falling back to env vars (config.ts) when no realm attribute is set.
 */

import { config } from '@/config'
import { logger } from '@/lib/logger'
import type KcAdminClient from '@keycloak/keycloak-admin-client'
import type { ConsentConfig } from '@/lib/consent/types'
import type { IalConfig, IdentityAssuranceLevel } from '@/lib/consent/types'

// Module-level cache
let consentOverrides: Partial<ConsentConfig> | null = null
let ialOverrides: Partial<IalConfig> | null = null
let loaded = false

// ─── Consent ─────────────────────────────────────────────────────────

const CONSENT_PREFIX = 'consent_settings.'

function parseConsentFromAttributes(attrs: Record<string, string>): Partial<ConsentConfig> | null {
  // Only return overrides if at least one key exists
  const hasAny = Object.keys(attrs).some(k => k.startsWith(CONSENT_PREFIX))
  if (!hasAny) return null

  const get = (key: string) => attrs[`${CONSENT_PREFIX}${key}`]

  const result: Partial<ConsentConfig> = {}

  if (get('enabled') !== undefined) result.enabled = get('enabled') === 'true'
  if (get('mode') !== undefined) {
    const m = get('mode')
    if (m === 'enforce' || m === 'audit-only' || m === 'disabled') result.mode = m
  }
  if (get('cache_ttl') !== undefined) result.cacheTtl = parseInt(get('cache_ttl'), 10)
  if (get('exempt_clients') !== undefined) {
    result.exemptClients = get('exempt_clients').split(',').map(s => s.trim()).filter(Boolean)
  }
  if (get('required_resource_types') !== undefined) {
    result.requiredForResourceTypes = get('required_resource_types').split(',').map(s => s.trim()).filter(Boolean)
  }
  if (get('exempt_resource_types') !== undefined) {
    result.exemptResourceTypes = get('exempt_resource_types').split(',').map(s => s.trim()).filter(Boolean)
  }

  return result
}

function consentToAttributes(settings: ConsentConfig): Record<string, string> {
  return {
    [`${CONSENT_PREFIX}enabled`]: settings.enabled.toString(),
    [`${CONSENT_PREFIX}mode`]: settings.mode,
    [`${CONSENT_PREFIX}cache_ttl`]: settings.cacheTtl.toString(),
    [`${CONSENT_PREFIX}exempt_clients`]: settings.exemptClients.join(','),
    [`${CONSENT_PREFIX}required_resource_types`]: settings.requiredForResourceTypes.join(','),
    [`${CONSENT_PREFIX}exempt_resource_types`]: settings.exemptResourceTypes.join(','),
  }
}

// ─── IAL ─────────────────────────────────────────────────────────────

const IAL_PREFIX = 'ial_settings.'

function parseIalFromAttributes(attrs: Record<string, string>): Partial<IalConfig> | null {
  const hasAny = Object.keys(attrs).some(k => k.startsWith(IAL_PREFIX))
  if (!hasAny) return null

  const get = (key: string) => attrs[`${IAL_PREFIX}${key}`]

  const result: Partial<IalConfig> = {}
  const validLevels = ['level1', 'level2', 'level3', 'level4']

  if (get('enabled') !== undefined) result.enabled = get('enabled') === 'true'
  if (get('minimum_level') !== undefined) {
    const l = get('minimum_level')
    if (validLevels.includes(l)) result.minimumLevel = l as IdentityAssuranceLevel
  }
  if (get('sensitive_resource_types') !== undefined) {
    result.sensitiveResourceTypes = get('sensitive_resource_types').split(',').map(s => s.trim()).filter(Boolean)
  }
  if (get('sensitive_minimum_level') !== undefined) {
    const l = get('sensitive_minimum_level')
    if (validLevels.includes(l)) result.sensitiveMinimumLevel = l as IdentityAssuranceLevel
  }
  if (get('verify_patient_link') !== undefined) result.verifyPatientLink = get('verify_patient_link') === 'true'
  if (get('allow_on_person_lookup_failure') !== undefined) result.allowOnPersonLookupFailure = get('allow_on_person_lookup_failure') === 'true'
  if (get('cache_ttl') !== undefined) result.cacheTtl = parseInt(get('cache_ttl'), 10)

  return result
}

function ialToAttributes(settings: IalConfig): Record<string, string> {
  return {
    [`${IAL_PREFIX}enabled`]: settings.enabled.toString(),
    [`${IAL_PREFIX}minimum_level`]: settings.minimumLevel,
    [`${IAL_PREFIX}sensitive_resource_types`]: settings.sensitiveResourceTypes.join(','),
    [`${IAL_PREFIX}sensitive_minimum_level`]: settings.sensitiveMinimumLevel,
    [`${IAL_PREFIX}verify_patient_link`]: settings.verifyPatientLink.toString(),
    [`${IAL_PREFIX}allow_on_person_lookup_failure`]: settings.allowOnPersonLookupFailure.toString(),
    [`${IAL_PREFIX}cache_ttl`]: settings.cacheTtl.toString(),
  }
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Load consent + IAL settings from Keycloak realm attributes into memory.
 * Called at startup and after saves.
 */
export async function loadRuntimeConfig(admin: KcAdminClient): Promise<void> {
  try {
    const realm = await admin.realms.findOne({ realm: process.env.KEYCLOAK_REALM! })
    const attrs = (realm?.attributes || {}) as Record<string, string>

    consentOverrides = parseConsentFromAttributes(attrs)
    ialOverrides = parseIalFromAttributes(attrs)
    loaded = true

    logger.admin.info('Runtime config loaded from Keycloak', {
      consentOverrides: !!consentOverrides,
      ialOverrides: !!ialOverrides,
    })
  } catch (error) {
    logger.admin.warn('Failed to load runtime config from Keycloak, using env var defaults', { error })
  }
}

/**
 * Get effective consent config: realm attribute overrides merged over env vars.
 */
export function getRuntimeConsentConfig(): ConsentConfig {
  const envDefaults: ConsentConfig = {
    enabled: config.consent.enabled,
    mode: config.consent.mode,
    cacheTtl: config.consent.cacheTtl,
    exemptClients: config.consent.exemptClients,
    requiredForResourceTypes: config.consent.requiredForResourceTypes,
    exemptResourceTypes: config.consent.exemptResourceTypes,
  }

  if (!consentOverrides) return envDefaults

  return { ...envDefaults, ...consentOverrides }
}

/**
 * Get effective IAL config: realm attribute overrides merged over env vars.
 */
export function getRuntimeIalConfig(): IalConfig {
  const envDefaults: IalConfig = {
    enabled: config.ial.enabled,
    minimumLevel: config.ial.minimumLevel,
    sensitiveResourceTypes: config.ial.sensitiveResourceTypes,
    sensitiveMinimumLevel: config.ial.sensitiveMinimumLevel,
    verifyPatientLink: config.ial.verifyPatientLink,
    allowOnPersonLookupFailure: config.ial.allowOnPersonLookupFailure,
    cacheTtl: config.ial.cacheTtl,
  }

  if (!ialOverrides) return envDefaults

  return { ...envDefaults, ...ialOverrides }
}

/**
 * Save consent config to Keycloak realm attributes and update in-memory cache.
 */
export async function saveConsentConfig(admin: KcAdminClient, settings: ConsentConfig): Promise<void> {
  const realm = await admin.realms.findOne({ realm: process.env.KEYCLOAK_REALM! })
  const existingAttrs = (realm?.attributes || {}) as Record<string, string>

  const attributes = {
    ...existingAttrs,
    ...consentToAttributes(settings),
  }

  await admin.realms.update(
    { realm: process.env.KEYCLOAK_REALM! },
    { attributes }
  )

  // Update in-memory cache
  consentOverrides = { ...settings }
  logger.admin.info('Consent config saved to Keycloak realm attributes', { settings })
}

/**
 * Save IAL config to Keycloak realm attributes and update in-memory cache.
 */
export async function saveIalConfig(admin: KcAdminClient, settings: IalConfig): Promise<void> {
  const realm = await admin.realms.findOne({ realm: process.env.KEYCLOAK_REALM! })
  const existingAttrs = (realm?.attributes || {}) as Record<string, string>

  const attributes = {
    ...existingAttrs,
    ...ialToAttributes(settings),
  }

  await admin.realms.update(
    { realm: process.env.KEYCLOAK_REALM! },
    { attributes }
  )

  // Update in-memory cache
  ialOverrides = { ...settings }
  logger.admin.info('IAL config saved to Keycloak realm attributes', { settings })
}

/** Whether runtime config has been loaded from Keycloak at least once */
export function isRuntimeConfigLoaded(): boolean {
  return loaded
}
