/**
 * User-Access Brand Bundle Service
 * SMART App Launch 2.2.0 Section 8
 * 
 * Generates a FHIR Bundle (type: collection) containing:
 * - Organization resource with organization-brand and organization-portal extensions
 * - Endpoint resources for each registered FHIR server
 * 
 * Published at /branding.json and referenced from .well-known/smart-configuration
 */

import { config } from '../config'
import { getAllServers, ensureServersInitialized } from './fhir-server-store'
import { fhirVersionToSemver } from './fhir-utils'
import { getRuntimeBrandConfig } from './runtime-config'
import type { UserAccessBrandBundleType } from '../schemas'

interface BrandBundleCache {
  bundle: UserAccessBrandBundleType
  timestamp: number
  etag: string
}

class BrandBundleService {
  private cache: BrandBundleCache | null = null
  private readonly cacheTTL = 60_000 // 1 minute

  /** Get or build the Brand Bundle, with caching */
  async getBrandBundle(): Promise<{ bundle: UserAccessBrandBundleType; etag: string }> {
    const now = Date.now()
    if (this.cache && (now - this.cache.timestamp) < this.cacheTTL) {
      return { bundle: this.cache.bundle, etag: this.cache.etag }
    }

    const bundle = await this.buildBrandBundle()
    const etag = `W/"${bundle.timestamp}"`
    this.cache = { bundle, timestamp: now, etag }
    return { bundle, etag }
  }

  /** Invalidate cache (e.g. after admin updates brand settings) */
  clearCache(): void {
    this.cache = null
  }

  /** Build the full FHIR Brand Bundle from config + registered FHIR servers */
  private async buildBrandBundle(): Promise<UserAccessBrandBundleType> {
    await ensureServersInitialized()
    const servers = await getAllServers()
    const brand = getRuntimeBrandConfig()
    const orgId = 'primary-brand'
    const entries: UserAccessBrandBundleType['entry'] = []

    // Build Endpoint resources from registered FHIR servers
    const endpointRefs: Array<{ reference: string }> = []
    for (const server of servers) {
      const endpointId = `endpoint-${server.identifier}`
      const proxyBase = `${config.baseUrl}/${config.name}/${server.identifier}/${server.metadata.fhirVersion}`

      entries.push({
        fullUrl: `${config.baseUrl}/branding/Endpoint/${endpointId}`,
        resource: this.buildEndpoint(endpointId, server.name, proxyBase, server.metadata.fhirVersion, brand)
      })
      endpointRefs.push({ reference: `Endpoint/${endpointId}` })
    }

    // Build Organization resource (the Brand)
    entries.unshift({
      fullUrl: `${config.baseUrl}/branding/Organization/${orgId}`,
      resource: this.buildOrganization(orgId, endpointRefs, brand)
    })

    return {
      resourceType: 'Bundle',
      id: 'user-access-brands',
      type: 'collection',
      timestamp: new Date().toISOString(),
      entry: entries
    }
  }

  /** Build a User Access Endpoint FHIR resource */
  private buildEndpoint(
    id: string,
    name: string,
    address: string,
    fhirVersion: string,
    brand: ReturnType<typeof getRuntimeBrandConfig>
  ): Record<string, unknown> {
    return {
      resourceType: 'Endpoint',
      id,
      status: 'active',
      name: `FHIR ${fhirVersion} Endpoint for ${brand.name}`,
      address,
      connectionType: {
        system: 'http://terminology.hl7.org/CodeSystem/endpoint-connection-type',
        code: 'hl7-fhir-rest'
      },
      extension: [{
        url: 'http://hl7.org/fhir/StructureDefinition/endpoint-fhir-version',
        valueCode: fhirVersionToSemver(fhirVersion)
      }],
      contact: [{
        system: 'url',
        value: brand.website
      }],
      payloadType: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/endpoint-payload-type',
          code: 'none'
        }]
      }]
    }
  }

  /** Build the User Access Brand (Organization) FHIR resource */
  private buildOrganization(
    id: string,
    endpointRefs: Array<{ reference: string }>,
    brand: ReturnType<typeof getRuntimeBrandConfig>
  ): Record<string, unknown> {
    const extensions: Array<Record<string, unknown>> = []

    // organization-brand extension
    const brandExtParts: Array<Record<string, unknown>> = []
    if (brand.logoUrl) {
      brandExtParts.push({ url: 'brandLogo', valueUrl: brand.logoUrl })
    }
    if (brand.logoLicenseUrl) {
      brandExtParts.push({ url: 'brandLogoLicense', valueUrl: brand.logoLicenseUrl })
    }
    brandExtParts.push({ url: 'brandBundle', valueUrl: `${config.baseUrl}/branding.json` })

    extensions.push({
      url: 'http://hl7.org/fhir/StructureDefinition/organization-brand',
      extension: brandExtParts
    })

    // organization-portal extension
    const portalExtParts: Array<Record<string, unknown>> = []
    if (brand.portalName) {
      portalExtParts.push({ url: 'portalName', valueString: brand.portalName })
    }
    if (brand.portalDescription) {
      portalExtParts.push({ url: 'portalDescription', valueMarkdown: brand.portalDescription })
    }
    if (brand.portalUrl) {
      portalExtParts.push({ url: 'portalUrl', valueUrl: brand.portalUrl })
    }
    if (brand.portalLogoUrl) {
      portalExtParts.push({ url: 'portalLogo', valueUrl: brand.portalLogoUrl })
    }
    if (brand.portalLogoLicenseUrl) {
      portalExtParts.push({ url: 'portalLogoLicense', valueUrl: brand.portalLogoLicenseUrl })
    }
    for (const ref of endpointRefs) {
      portalExtParts.push({ url: 'portalEndpoint', valueReference: ref })
    }

    if (portalExtParts.length > 0) {
      extensions.push({
        url: 'http://hl7.org/fhir/StructureDefinition/organization-portal',
        extension: portalExtParts
      })
    }

    // Build address if any address fields configured
    const address: Array<Record<string, string>> = []
    if (brand.addressCity || brand.addressState || brand.addressPostalCode) {
      const addr: Record<string, string> = {}
      if (brand.addressCity) addr.city = brand.addressCity
      if (brand.addressState) addr.state = brand.addressState
      if (brand.addressPostalCode) addr.postalCode = brand.addressPostalCode
      if (brand.addressCountry) addr.country = brand.addressCountry
      address.push(addr)
    }

    // Build the Organization type coding from brand category
    const categoryMap: Record<string, string> = {
      prov: 'Healthcare Provider',
      pay: 'Payer',
      laboratory: 'Laboratory',
      imaging: 'Imaging Center',
      pharmacy: 'Pharmacy',
      network: 'Health Information Network',
      aggregator: 'Data Aggregator'
    }

    return {
      resourceType: 'Organization',
      id,
      active: true,
      name: brand.name,
      ...(brand.aliases.length > 0 && { alias: brand.aliases }),
      type: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/organization-type',
          code: brand.category,
          display: categoryMap[brand.category] || brand.category
        }]
      }],
      extension: extensions,
      identifier: [{
        system: 'urn:ietf:rfc:3986',
        value: brand.identifier
      }],
      telecom: [{
        system: 'url',
        value: brand.website
      }],
      ...(address.length > 0 && { address }),
      endpoint: endpointRefs
    }
  }

}

export const brandBundleService = new BrandBundleService()
