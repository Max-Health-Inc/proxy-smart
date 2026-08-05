// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * A request body must reach the handler byte-for-byte.
 *
 * Guards a global `sanitize: Bun.escapeHTML` that corrupted every request-body
 * string (twice — it escapes `&` too). It broke SMART Backend Services outright:
 * inline JWKS stored unparseable, so client_assertion failed with "has no
 * registered JWKS". Passwords and query-string URLs were mangled the same way.
 * Asserted at the framework boundary, since the setting was global.
 */
import { describe, it, expect } from 'bun:test'
import { Elysia, t } from 'elysia'
import { ELYSIA_OPTIONS } from '@/app-factory'

/** Every character an HTML escaper would rewrite, plus realistic payloads. */
const PAYLOADS = {
  htmlSpecials: `X"<>&'Y`,
  inlineJwks: JSON.stringify({ keys: [{ kty: 'RSA', n: 'A&B', kid: 'k<1>' }] }),
  urlWithQuery: 'https://example.org/fhir?a=1&b=2',
  passwordish: `p@ss"w<o>rd&'`,
}

/**
 * Built from the REAL constructor options. Mounting a route on a locally-built
 * Elysia would pass regardless of what app-factory configures, which is precisely
 * why the regression survived.
 */
function createApp() {
  return new Elysia({ ...ELYSIA_OPTIONS, name: 'request-integrity-test' })
    .post('/echo', ({ body }) => body, {
      body: t.Object({ value: t.String() }),
    })
}

async function roundTrip(value: string): Promise<string> {
  const app = createApp()
  const res = await app.handle(
    new Request('http://localhost/echo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ value }),
    }),
  )
  const body = (await res.json()) as { value: string }
  return body.value
}

describe.each(Object.entries(PAYLOADS))('request body integrity — %s', (_name, value) => {
  it('reaches the handler unchanged', async () => {
    expect(await roundTrip(value)).toBe(value)
  })
})

describe('request body integrity', () => {
  it('leaves an inline JWKS parseable', async () => {
    // The concrete failure: a JWKS that survives transport but not JSON.parse is
    // indistinguishable, to the caller, from a client that never registered one.
    const received = await roundTrip(PAYLOADS.inlineJwks)
    expect(() => JSON.parse(received)).not.toThrow()
    expect(JSON.parse(received).keys[0].kid).toBe('k<1>')
  })

  it('does not HTML-escape, even once', async () => {
    // Pinned against the exact regression: a single escapeHTML pass is already
    // corruption, so asserting "not double-escaped" would let it back in.
    const received = await roundTrip(PAYLOADS.htmlSpecials)
    expect(received).not.toContain('&quot;')
    expect(received).not.toContain('&amp;')
    expect(received).not.toContain('&lt;')
  })
})
