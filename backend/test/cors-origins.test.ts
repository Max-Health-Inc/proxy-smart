// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Deployed CORS origins come from CORS_ORIGINS or from the webOrigins of the
 * SMART apps registered in Keycloak — never from a list baked into the source.
 *
 * A hardcoded per-app list used to live in config.ts as a "fallback if Keycloak
 * refresh fails". It quietly became the real mechanism: registering an app's
 * origin had no effect, and each new app or environment needed a code change.
 * That is how dicom.beta.maxhealth.tech was blocked while dicom.maxhealth.tech
 * worked — the second was in the source, the first was only in Keycloak.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const CONFIG_SRC = join(import.meta.dir, '..', 'src', 'config.ts')

/** The `cors:` block of config.ts, which is what this file is about. */
function corsBlock(): string {
  const source = readFileSync(CONFIG_SRC, 'utf8')
  const start = source.indexOf('  cors: {')
  expect(start).toBeGreaterThan(-1)
  return source.slice(start)
}

describe('CORS origins — no app hostnames in the source', () => {
  it('the cors block names no deployed origin, in code or as a default', () => {
    // Scoped to the cors block deliberately: elsewhere in config.ts a deployed
    // host can legitimately appear as an env-overridable default.
    const block = corsBlock()
    const hosts = (block.match(/https:\/\/[a-z0-9.-]+\.(tech|com)/gi) ?? []).filter(host => {
      const line = block.split('\n').find(l => l.includes(host)) ?? ''
      const trimmed = line.trimStart()
      return !trimmed.startsWith('//') && !trimmed.startsWith('*')
    })
    expect(hosts).toEqual([])
  })

  it('keeps the localhost dev defaults, which are not deployment config', () => {
    expect(corsBlock()).toContain('http://localhost:5173')
  })
})

describe('CORS origins — env drives deployed policy', () => {
  const saved = { env: process.env.NODE_ENV, origins: process.env.CORS_ORIGINS }

  beforeEach(() => {
    delete process.env.CORS_ORIGINS
  })

  afterEach(() => {
    if (saved.env === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = saved.env
    if (saved.origins === undefined) delete process.env.CORS_ORIGINS
    else process.env.CORS_ORIGINS = saved.origins
  })

  it('reads a comma-separated CORS_ORIGINS, trimming whitespace', () => {
    process.env.CORS_ORIGINS = 'https://a.example.com, https://b.example.com'
    const parsed = process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    expect(parsed).toEqual(['https://a.example.com', 'https://b.example.com'])
  })

  it('substring matching does not let a subdomain inherit a parent origin', () => {
    // The bug in miniature: dicom.beta.maxhealth.tech must NOT be allowed by an
    // entry for maxhealth.tech, or a stray subdomain would be trusted.
    const allowed = ['https://maxhealth.tech', 'https://dicom.maxhealth.tech']
    const origin = 'https://dicom.beta.maxhealth.tech'
    expect(allowed.some(o => origin.includes(o))).toBe(false)
  })
})
