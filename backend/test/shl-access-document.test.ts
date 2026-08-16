// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * The smart-api-access document a recipient decrypts.
 *
 * It used to be built once at mint and stored as ciphertext, which the manifest
 * replayed forever. So when `complete` was corrected to count study scoping, every
 * link already in circulation kept telling recipients it carried the full record —
 * over a view where the proxy answers all but three queries with 403.
 *
 * Deriving it from the session on each fetch is what makes a fix reach links that
 * already exist. These tests pin that the document follows the session.
 */
import { describe, expect, it } from 'bun:test'
import { buildSmartApiAccess } from '../src/routes/api/shl'

const base = {
  sessionToken: 'opaque-session-token',
  patientId: 'max-nussbaumer',
  expiresAt: Date.now() + 3600_000,
}

const parse = (json: string) => JSON.parse(json) as Record<string, unknown>

/**
 * `query` is the SHL spec's own field — "hints to the client, indicating queries it
 * might want to make". A scoped link has no other standard way to say what it holds,
 * which is the gap `complete` was invented to paper over.
 */
describe('buildSmartApiAccess — query hints', () => {
  it('points a study-scoped share at that study', () => {
    const doc = parse(buildSmartApiAccess({ ...base, studyInstanceUID: '1.2.840.113619.2.55.3' }))
    expect(doc.query).toEqual(['ImagingStudy?identifier=urn:oid:1.2.840.113619.2.55.3'])
  })

  /** Optional in the spec, and an omitted key is how "no hints" is expressed. */
  it('omits the key entirely for a whole-patient share', () => {
    expect('query' in parse(buildSmartApiAccess(base))).toBe(false)
  })
})

describe('buildSmartApiAccess', () => {
  it('reports a whole-patient share as complete', () => {
    expect(parse(buildSmartApiAccess(base)).complete).toBe(true)
  })

  it('reports a study-scoped share as incomplete', () => {
    const doc = parse(buildSmartApiAccess({ ...base, studyInstanceUID: '1.2.840.113619.2.55.3' }))
    expect(doc.complete).toBe(false)
  })

  it('reports a de-selected share as incomplete', () => {
    const doc = parse(buildSmartApiAccess({
      ...base,
      shareScope: { excludedTypes: ['Condition'], excludedIds: [], excludedObservationCategories: [] },
    }))
    expect(doc.complete).toBe(false)
  })

  it('carries the session token and patient the viewer needs', () => {
    const doc = parse(buildSmartApiAccess(base))
    expect(doc.access_token).toBe('opaque-session-token')
    expect(doc.patient).toBe('max-nussbaumer')
    expect(doc.token_type).toBe('Bearer')
    expect(doc.scope).toBe('patient/*.read')
  })

  /** Frozen at mint, expires_in counted down from the wrong instant on every later fetch. */
  it('counts expires_in from now, not from mint', () => {
    const expiresIn = parse(buildSmartApiAccess({ ...base, expiresAt: Date.now() + 600_000 })).expires_in
    expect(expiresIn).toBeGreaterThan(590)
    expect(expiresIn).toBeLessThanOrEqual(600)
  })

  it('never reports a negative lifetime for an expired share', () => {
    expect(parse(buildSmartApiAccess({ ...base, expiresAt: Date.now() - 60_000 })).expires_in).toBe(0)
  })
})
