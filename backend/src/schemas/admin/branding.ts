/**
 * Branding Schemas
 * 
 * TypeBox schemas for User-Access Brand admin configuration (SMART App Launch 2.2.0 Section 8).
 */

import { t, type Static } from 'elysia'

/**
 * Brand category (organization type)
 */
export const BrandCategory = t.Union([
  t.Literal('prov'),
  t.Literal('pay'),
  t.Literal('laboratory'),
  t.Literal('imaging'),
  t.Literal('pharmacy'),
  t.Literal('network'),
  t.Literal('aggregator'),
], { description: 'Organization category per FHIR organization-type CodeSystem' })

export type BrandCategoryType = Static<typeof BrandCategory>

/**
 * Brand configuration (admin-editable settings)
 */
export const BrandConfig = t.Object({
  name: t.String({ description: 'Brand display name' }),
  website: t.String({ description: 'Brand website URL' }),
  logoUrl: t.Union([t.String(), t.Null()], { description: 'Brand logo URL (SVG or 1024px PNG, transparent background)' }),
  logoLicenseUrl: t.Union([t.String(), t.Null()], { description: 'Logo license URL' }),
  aliases: t.Array(t.String(), { description: 'Alternative brand names' }),
  category: t.String({ description: 'Organization category (prov, pay, laboratory, imaging, pharmacy, network, aggregator)' }),
  portalName: t.Union([t.String(), t.Null()], { description: 'Patient-facing portal name' }),
  portalUrl: t.Union([t.String(), t.Null()], { description: 'Patient-facing portal URL' }),
  portalDescription: t.Union([t.String(), t.Null()], { description: 'Patient-facing portal description (Markdown)' }),
  portalLogoUrl: t.Union([t.String(), t.Null()], { description: 'Patient-facing portal logo URL' }),
  portalLogoLicenseUrl: t.Union([t.String(), t.Null()], { description: 'Portal logo license URL' }),
  addressCity: t.Union([t.String(), t.Null()], { description: 'Organization city' }),
  addressState: t.Union([t.String(), t.Null()], { description: 'Organization state/province' }),
  addressPostalCode: t.Union([t.String(), t.Null()], { description: 'Organization postal code' }),
  addressCountry: t.Union([t.String(), t.Null()], { description: 'Organization country' }),
  identifier: t.String({ description: 'Brand identifier URI (typically the brand website URL)' }),
}, { title: 'BrandConfig' })

export type BrandConfigType = Static<typeof BrandConfig>

/**
 * Brand config update response
 */
export const BrandConfigUpdateResponse = t.Object({
  message: t.String(),
  config: BrandConfig,
  timestamp: t.String(),
}, { title: 'BrandConfigUpdateResponse' })

export type BrandConfigUpdateResponseType = Static<typeof BrandConfigUpdateResponse>
