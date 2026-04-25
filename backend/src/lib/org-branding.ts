/**
 * Organization Branding Utilities
 * 
 * Reads/writes brand override settings from Keycloak organization attributes.
 * Uses the same `brand_settings.*` prefix as realm-level branding,
 * but stored in the KC organization's attributes map.
 * 
 * All fields are optional (partial overrides). Missing fields cascade to realm defaults.
 */

import type KcAdminClient from '@keycloak/keycloak-admin-client'
import type { BrandConfigType } from '@/schemas'
import { isValidUserAccessCategoryValueSetCode } from 'hl7.fhir.uv.smart-app-launch-generated/valuesets/ValueSet-UserAccessCategoryValueSet'
import type { BrandCategoryType } from '@/schemas/admin/branding'
import { logger } from './logger'

const BRAND_PREFIX = 'brand_settings.'

// ─── In-memory cache for org brand overrides ────────────────────────
// Populated by admin save operations and initial load
const orgBrandCache = new Map<string, Partial<BrandConfigType>>()

/** Get all cached org brand overrides (for brand bundle generation) */
export function getAllOrgBrands(): Map<string, Partial<BrandConfigType>> {
  return orgBrandCache
}

/**
 * Parse partial brand config from KC org attributes.
 * KC org attributes are Record<string, string[]>, so we take [0] of each.
 */
export function parseOrgBrandAttributes(attrs: Record<string, string[]>): Partial<BrandConfigType> {
  const result: Partial<BrandConfigType> = {}

  const get = (key: string): string | undefined => {
    const vals = attrs[`${BRAND_PREFIX}${key}`]
    return vals?.[0]
  }

  if (get('name') !== undefined) result.name = get('name')!
  if (get('website') !== undefined) result.website = get('website')!
  if (get('logo_url') !== undefined) result.logoUrl = get('logo_url') || null
  if (get('logo_license_url') !== undefined) result.logoLicenseUrl = get('logo_license_url') || null
  if (get('aliases') !== undefined) {
    result.aliases = (get('aliases') || '').split(',').map(s => s.trim()).filter(Boolean)
  }
  if (get('category') !== undefined) {
    const cat = get('category')!
    if (isValidUserAccessCategoryValueSetCode(cat)) {
      result.category = cat as BrandCategoryType
    }
  }
  if (get('portal_name') !== undefined) result.portalName = get('portal_name') || null
  if (get('portal_url') !== undefined) result.portalUrl = get('portal_url') || null
  if (get('portal_description') !== undefined) result.portalDescription = get('portal_description') || null
  if (get('portal_logo_url') !== undefined) result.portalLogoUrl = get('portal_logo_url') || null
  if (get('portal_logo_license_url') !== undefined) result.portalLogoLicenseUrl = get('portal_logo_license_url') || null
  if (get('address_city') !== undefined) result.addressCity = get('address_city') || null
  if (get('address_state') !== undefined) result.addressState = get('address_state') || null
  if (get('address_postal_code') !== undefined) result.addressPostalCode = get('address_postal_code') || null
  if (get('address_country') !== undefined) result.addressCountry = get('address_country') || null
  if (get('identifier') !== undefined) result.identifier = get('identifier')!

  return result
}

/**
 * Convert partial brand config to KC org attributes format (Record<string, string[]>).
 * Only includes keys that are explicitly set (non-undefined).
 */
export function brandToOrgAttributes(settings: Partial<BrandConfigType>): Record<string, string[]> {
  const attrs: Record<string, string[]> = {}
  const set = (key: string, value: string | null | undefined) => {
    if (value !== undefined) {
      attrs[`${BRAND_PREFIX}${key}`] = [value ?? '']
    }
  }

  if (settings.name !== undefined) set('name', settings.name)
  if (settings.website !== undefined) set('website', settings.website)
  if (settings.logoUrl !== undefined) set('logo_url', settings.logoUrl)
  if (settings.logoLicenseUrl !== undefined) set('logo_license_url', settings.logoLicenseUrl)
  if (settings.aliases !== undefined) set('aliases', settings.aliases.join(','))
  if (settings.category !== undefined) set('category', settings.category)
  if (settings.portalName !== undefined) set('portal_name', settings.portalName)
  if (settings.portalUrl !== undefined) set('portal_url', settings.portalUrl)
  if (settings.portalDescription !== undefined) set('portal_description', settings.portalDescription)
  if (settings.portalLogoUrl !== undefined) set('portal_logo_url', settings.portalLogoUrl)
  if (settings.portalLogoLicenseUrl !== undefined) set('portal_logo_license_url', settings.portalLogoLicenseUrl)
  if (settings.addressCity !== undefined) set('address_city', settings.addressCity)
  if (settings.addressState !== undefined) set('address_state', settings.addressState)
  if (settings.addressPostalCode !== undefined) set('address_postal_code', settings.addressPostalCode)
  if (settings.addressCountry !== undefined) set('address_country', settings.addressCountry)
  if (settings.identifier !== undefined) set('identifier', settings.identifier)

  return attrs
}

/**
 * Read org brand overrides from Keycloak and update cache.
 */
export async function getOrgBranding(admin: KcAdminClient, orgId: string): Promise<Partial<BrandConfigType>> {
  const org = await admin.organizations.findOne({ id: orgId })
  if (!org) throw new Error(`Organization ${orgId} not found`)
  const overrides = parseOrgBrandAttributes((org.attributes as Record<string, string[]>) ?? {})
  // Update cache
  if (Object.keys(overrides).length > 0) {
    orgBrandCache.set(orgId, overrides)
  } else {
    orgBrandCache.delete(orgId)
  }
  return overrides
}

/**
 * Save org brand overrides to Keycloak organization attributes and update cache.
 * Merges brand_settings.* keys with existing non-brand attributes.
 */
export async function saveOrgBranding(
  admin: KcAdminClient,
  orgId: string,
  settings: Partial<BrandConfigType>,
): Promise<void> {
  const org = await admin.organizations.findOne({ id: orgId })
  if (!org) throw new Error(`Organization ${orgId} not found`)

  const existingAttrs = org.attributes ?? {}

  // Remove old brand_settings.* keys, then merge new ones
  const cleaned: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(existingAttrs)) {
    if (!k.startsWith(BRAND_PREFIX)) cleaned[k] = v
  }

  const brandAttrs = brandToOrgAttributes(settings)
  const merged = { ...cleaned, ...brandAttrs }

  await admin.organizations.updateById(
    { id: orgId },
    { ...org, attributes: merged },
  )

  // Update cache
  if (Object.keys(settings).length > 0) {
    orgBrandCache.set(orgId, settings)
  } else {
    orgBrandCache.delete(orgId)
  }

  logger.admin.info('Org branding saved', { orgId, name: settings.name })
}

/**
 * Load all org brand overrides from Keycloak into cache.
 * Called during runtime config initialization when an admin client is available.
 */
export async function loadAllOrgBrands(admin: KcAdminClient): Promise<void> {
  try {
    const orgs = await admin.organizations.find({ max: 500 })
    orgBrandCache.clear()
    for (const org of orgs) {
      if (!org.id || !org.attributes) continue
      const overrides = parseOrgBrandAttributes(org.attributes as Record<string, string[]>)
      if (Object.keys(overrides).length > 0) {
        orgBrandCache.set(org.id, overrides)
      }
    }
    logger.admin.info('Org brand overrides loaded', { count: orgBrandCache.size })
  } catch (error) {
    logger.admin.warn('Failed to load org brand overrides', { error })
  }
}
