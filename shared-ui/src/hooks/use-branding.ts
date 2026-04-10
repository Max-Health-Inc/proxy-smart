import { useState, useEffect } from 'react'
import type { UserAccessBrandsBundle, UserAccessBrand, OrganizationBrand } from 'hl7.fhir.uv.smart-app-launch-generated'

export interface BrandInfo {
  name: string
  logoUrl: string | null
  website: string | null
}

/** Extract brand name and logo from the /branding.json FHIR Bundle */
function parseBrandBundle(bundle: UserAccessBrandsBundle): BrandInfo {
  const fallback: BrandInfo = { name: 'Proxy Smart', logoUrl: null, website: null }
  const entries = bundle.entry
  if (!Array.isArray(entries)) return fallback

  const org = entries.find(e => (e.resource as UserAccessBrand | undefined)?.resourceType === 'Organization')?.resource as UserAccessBrand | undefined
  if (!org) return fallback

  const name = org.name || fallback.name

  let logoUrl: string | null = null
  let website: string | null = null

  if (Array.isArray(org.extension)) {
    const brandExt = org.extension.find(
      (e): e is OrganizationBrand => e.url === 'http://hl7.org/fhir/StructureDefinition/organization-brand'
    )
    if (brandExt) {
      const inner = brandExt.extension
      logoUrl = (inner?.find(e => e.url === 'brandLogo') as { valueUrl?: string } | undefined)?.valueUrl ?? null
    }
  }

  const telecoms = org.telecom
  if (Array.isArray(telecoms)) {
    website = telecoms.find(t => t.system === 'url')?.value ?? null
  }

  return { name, logoUrl, website }
}

let cachedBrand: BrandInfo | null = null
let fetchPromise: Promise<BrandInfo> | null = null

function fetchBrand(): Promise<BrandInfo> {
  if (cachedBrand) return Promise.resolve(cachedBrand)
  if (fetchPromise) return fetchPromise

  fetchPromise = fetch('/branding.json')
    .then(res => {
      if (!res.ok) throw new Error(`${res.status}`)
      return res.json()
    })
    .then(bundle => {
      cachedBrand = parseBrandBundle(bundle)
      return cachedBrand
    })
    .catch(() => {
      cachedBrand = { name: 'Proxy Smart', logoUrl: null, website: null }
      return cachedBrand
    })
    .finally(() => { fetchPromise = null })

  return fetchPromise
}

/** Fetch brand info from /branding.json (cached, singleton) */
export function useBranding(): BrandInfo | null {
  const [brand, setBrand] = useState<BrandInfo | null>(cachedBrand)

  useEffect(() => {
    fetchBrand().then(setBrand)
  }, [])

  return brand
}
