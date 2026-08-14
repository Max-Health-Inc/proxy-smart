// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Advertising our OAuth endpoints in the CapabilityStatement we serve.
 *
 * THE FAILURE THIS FIXES. HAPI does not know it sits behind a SMART authorization layer, so it
 * returns `rest[].security` empty and /metadata was passed through with URL rewriting only. A client
 * doing the CapabilityStatement half of SMART discovery therefore found nothing and gave up, while
 * .well-known/smart-configuration next door was complete. Our own provisioning job hit exactly that
 * and a member's record went unwritten.
 *
 * What is pinned is mostly what must NOT happen: replacing endpoints a server already declares, and
 * turning an unexpected upstream body into an error instead of passing it through.
 */
import { describe, it, expect } from 'bun:test'
import { withSmartSecurity } from '../src/lib/capability-security'

const OAUTH_URIS = 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris'

const ENDPOINTS = {
  authorization_endpoint: 'https://api.example.com/auth/authorize',
  token_endpoint: 'https://api.example.com/auth/token',
  registration_endpoint: 'https://api.example.com/auth/register',
}

const capability = (rest: unknown[]) =>
  JSON.stringify({ resourceType: 'CapabilityStatement', status: 'active', rest })

/** The oauth-uris sub-extensions of the first rest entry, as a plain name -> uri map. */
function advertised(body: string): Record<string, string> {
  const parsed = JSON.parse(body)
  const oauth = parsed.rest[0].security.extension.find((e: { url: string }) => e.url === OAUTH_URIS)
  const map: Record<string, string> = {}
  for (const entry of oauth?.extension ?? []) map[entry.url] = entry.valueUri
  return map
}

describe('withSmartSecurity', () => {
  it('advertises the endpoints a headless client needs', () => {
    const result = withSmartSecurity(capability([{ mode: 'server' }]), ENDPOINTS)

    expect(advertised(result)).toEqual({
      authorize: ENDPOINTS.authorization_endpoint,
      token: ENDPOINTS.token_endpoint,
      register: ENDPOINTS.registration_endpoint,
    })
  })

  it('declares SMART-on-FHIR as the security service', () => {
    const result = withSmartSecurity(capability([{ mode: 'server' }]), ENDPOINTS)

    const codes = JSON.parse(result).rest[0].security.service.flatMap(
      (s: { coding?: { code?: string }[] }) => s.coding?.map((c) => c.code) ?? [],
    )
    expect(codes).toContain('SMART-on-FHIR')
  })

  it('annotates a rest entry with no mode, which is the only one', () => {
    const result = withSmartSecurity(capability([{}]), ENDPOINTS)

    expect(advertised(result).token).toBe(ENDPOINTS.token_endpoint)
  })

  it('leaves a server that already advertises its own endpoints alone', () => {
    // It knows better than we do; overwriting would point clients at the wrong authorization server.
    const existing = capability([
      {
        mode: 'server',
        security: {
          extension: [{ url: OAUTH_URIS, extension: [{ url: 'token', valueUri: 'https://theirs/token' }] }],
        },
      },
    ])

    expect(withSmartSecurity(existing, ENDPOINTS)).toBe(existing)
  })

  it('omits endpoints that are not configured rather than emitting empty ones', () => {
    const result = withSmartSecurity(capability([{ mode: 'server' }]), {
      authorization_endpoint: ENDPOINTS.authorization_endpoint,
      token_endpoint: ENDPOINTS.token_endpoint,
    })

    expect(Object.keys(advertised(result))).toEqual(['authorize', 'token'])
  })

  it('passes the body through when discovery gave us nothing to advertise', () => {
    const body = capability([{ mode: 'server' }])

    // /metadata staying up matters more than annotating it.
    expect(withSmartSecurity(body, {})).toBe(body)
  })

  it('passes through anything that is not a CapabilityStatement', () => {
    for (const body of ['not json at all', '{"resourceType":"OperationOutcome"}', '[]', 'null']) {
      expect(withSmartSecurity(body, ENDPOINTS)).toBe(body)
    }
  })

  it('keeps the rest of the document intact', () => {
    const body = JSON.stringify({
      resourceType: 'CapabilityStatement',
      status: 'active',
      fhirVersion: '4.0.1',
      rest: [{ mode: 'server', resource: [{ type: 'Patient' }] }],
    })

    const parsed = JSON.parse(withSmartSecurity(body, ENDPOINTS))
    expect(parsed.fhirVersion).toBe('4.0.1')
    expect(parsed.rest[0].resource).toEqual([{ type: 'Patient' }])
  })
})
