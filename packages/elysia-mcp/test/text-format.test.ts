// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { describe, expect, it } from 'bun:test'
import { chooseToolText } from '../src/text-format'

/** A uniform array of flat objects — the shape TOON's tabular form collapses. */
const flatList = JSON.stringify({
  roles: Array.from({ length: 20 }, (_, i) => ({
    id: `r-${i}`,
    name: `clinician-${i}`,
    composite: false,
    clientRole: false,
  })),
  total: 20,
})

/** What the admin API actually returns for users: nested maps and arrays. */
const nestedList = JSON.stringify({
  users: Array.from({ length: 20 }, (_, i) => ({
    id: `u-${i}`,
    username: `dr.smith${i}`,
    attributes: { fhirUser: `Practitioner/p-${i}`, department: 'cardiology' },
    realmRoles: ['clinician', 'offline_access'],
    fhirPerson: { resourceType: 'Practitioner', id: `p-${i}` },
  })),
  total: 20,
})

describe('chooseToolText', () => {
  it('defaults to leaving the payload untouched', () => {
    expect(chooseToolText(flatList)).toBe(flatList)
    expect(chooseToolText(flatList, 'json')).toBe(flatList)
  })

  it('collapses a uniform array of flat objects into TOON', () => {
    const out = chooseToolText(flatList, 'auto')
    expect(out).not.toBe(flatList)
    expect(out.length).toBeLessThan(flatList.length)
    // The tabular header is the whole point: fields declared once, then rows.
    expect(out).toContain('roles[20]{id,name,composite,clientRole}:')
  })

  it('keeps JSON when TOON would be larger', () => {
    // The guarantee that makes 'auto' safe to switch on globally: a shape TOON
    // handles badly is never made worse, it just stays as it was.
    expect(chooseToolText(nestedList, 'auto')).toBe(nestedList)
  })

  it('never returns anything longer than the JSON it was given', () => {
    const payloads = [
      flatList,
      nestedList,
      JSON.stringify({ success: true, status: 200 }),
      JSON.stringify({ error: 'invalid_target', error_description: 'not registered' }),
      JSON.stringify({ a: { b: { c: { d: { e: 'deeply nested' } } } } }),
      JSON.stringify([1, 2, 3]),
      JSON.stringify({ matrix: [[1, 2], [3, 4]] }),
    ]
    for (const p of payloads) {
      expect(chooseToolText(p, 'auto').length).toBeLessThanOrEqual(p.length)
    }
  })

  it('passes through text that is not JSON', () => {
    const plain = 'plain text response, not JSON at all'
    expect(chooseToolText(plain, 'auto')).toBe(plain)
  })

  it('leaves primitives alone', () => {
    // Valid JSON, but TOON's root framing only adds bytes.
    expect(chooseToolText('42', 'auto')).toBe('42')
    expect(chooseToolText('"a string"', 'auto')).toBe('"a string"')
    expect(chooseToolText('null', 'auto')).toBe('null')
  })

  it('round-trips the data it re-encodes', async () => {
    const { decode } = await import('@toon-format/toon')
    const out = chooseToolText(flatList, 'auto')
    expect(decode(out)).toEqual(JSON.parse(flatList))
  })
})
