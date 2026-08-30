// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * The app store is a PUBLIC page; the console its Admin link points at only ever works for a
 * staff admin. The link used to be shown unless `APP_STORE_HIDE_ADMIN` said otherwise, so every
 * deployment that set nothing published it — production included. Nothing leaked, because the
 * admin API is guarded, but a patient or clinician was invited to a door that could only refuse
 * them.
 *
 * It is opt IN now, and these assert the DEFAULT, which is the case that shipped wrong.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { readFileSync } from 'node:fs'

const ORIGINAL = process.env.APP_STORE_SHOW_ADMIN

/** The shipped markup, read the same way the server reads it. */
function shippedHtml(): string {
  return readFileSync(require.resolve('@proxy-smart/app-store/ui'), 'utf-8')
}

/** The reveal is a single global; mirroring the server's one-line injection keeps this honest. */
function served(): string {
  const html = shippedHtml()
  return process.env.APP_STORE_SHOW_ADMIN === 'true'
    ? html.replace('<head>', '<head><script>window.__APP_STORE_SHOW_ADMIN__=true</script>')
    : html
}

describe('app store admin link', () => {
  beforeEach(() => { delete process.env.APP_STORE_SHOW_ADMIN })
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.APP_STORE_SHOW_ADMIN
    else process.env.APP_STORE_SHOW_ADMIN = ORIGINAL
  })

  it('ships hidden in the markup, so nothing flashes and no deployment shows it by accident', () => {
    const html = shippedHtml()

    expect(html).toContain('id="adminLink"')
    expect(/<a[^>]*id="adminLink"[^>]*style="display:none"/.test(html)).toBe(true)
  })

  it('stays hidden when the deployment sets nothing', () => {
    expect(served()).not.toContain('__APP_STORE_SHOW_ADMIN__=true')
  })

  it('stays hidden for any value that is not exactly "true"', () => {
    for (const value of ['false', '1', 'yes', 'TRUE', '']) {
      process.env.APP_STORE_SHOW_ADMIN = value
      expect(served()).not.toContain('__APP_STORE_SHOW_ADMIN__=true')
    }
  })

  it('reveals it only when the deployment opts in', () => {
    process.env.APP_STORE_SHOW_ADMIN = 'true'

    expect(served()).toContain('__APP_STORE_SHOW_ADMIN__=true')
  })

  it('no longer honours the old opt-out name, which defaulted to showing', () => {
    process.env.APP_STORE_HIDE_ADMIN = 'false'
    try {
      expect(served()).not.toContain('__APP_STORE_SHOW_ADMIN__=true')
    } finally {
      delete process.env.APP_STORE_HIDE_ADMIN
    }
  })
})
