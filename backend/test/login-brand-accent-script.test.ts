/**
 * The login theme's brand-accent.js, which is the other half of /auth/login-brand.css.
 *
 * It ships as a Keycloak theme asset, so nothing else compiles or type-checks it. These
 * tests load the actual file and run it against a minimal DOM, pinning the contract the
 * endpoint depends on: the client_id from the login URL reaches the stylesheet request,
 * and a page without one is left alone.
 */
import { describe, it, expect } from 'bun:test'
import { fileURLToPath } from 'node:url'

// fileURLToPath, not URL.pathname: on Windows the latter yields a leading-slash "/C:/…".
const SCRIPT_PATH = fileURLToPath(
  new URL('../../keycloak/themes/proxy-smart/login/resources/js/brand-accent.js', import.meta.url),
)

const source = await Bun.file(SCRIPT_PATH).text()

interface FakeLink { rel?: string; href?: string; tagName: string }

function run(options: { search: string; scriptSrc?: string }) {
  const appended: FakeLink[] = []
  const document = {
    currentScript: options.scriptSrc ? { src: options.scriptSrc } : null,
    createElement: (tagName: string): FakeLink => ({ tagName }),
    head: { appendChild: (node: FakeLink) => appended.push(node) },
  }
  const window = { location: { search: options.search } }
  new Function('window', 'document', 'URL', 'URLSearchParams', source)(
    window, document, URL, URLSearchParams,
  )
  return appended
}

const BASE_SRC = 'http://kc.example/resources/abc/login/proxy-smart/js/brand-accent.js'

describe('brand-accent.js', () => {
  it('links the accent stylesheet for the launching client', () => {
    const [link] = run({ search: '?client_id=org-app&response_type=code', scriptSrc: BASE_SRC })
    expect(link?.rel).toBe('stylesheet')
    expect(link?.href).toBe('/auth/login-brand.css?client_id=org-app')
  })

  it('adds a link element, so the browser blocks paint on it like any stylesheet', () => {
    const appended = run({ search: '?client_id=x', scriptSrc: BASE_SRC })
    expect(appended).toHaveLength(1)
    expect(appended[0]?.tagName).toBe('link')
  })

  it('carries the client_id of a secondary page such as a failed password', () => {
    const [link] = run({
      search: '?session_code=abc&execution=def&client_id=brand-test&tab_id=xyz',
      scriptSrc: BASE_SRC,
    })
    expect(link?.href).toContain('client_id=brand-test')
  })

  it('does nothing on a page with no client_id', () => {
    expect(run({ search: '', scriptSrc: BASE_SRC })).toHaveLength(0)
    expect(run({ search: '?foo=bar', scriptSrc: BASE_SRC })).toHaveLength(0)
  })

  it('escapes a client_id so it cannot break out of the query string', () => {
    const [link] = run({ search: '?client_id=' + encodeURIComponent('a&b=c'), scriptSrc: BASE_SRC })
    expect(link?.href).toBe('/auth/login-brand.css?client_id=a%26b%3Dc')
  })

  it('honours a cross-origin base passed through the script src', () => {
    const [link] = run({
      search: '?client_id=x',
      scriptSrc: BASE_SRC + '?base=https://api.example.com',
    })
    expect(link?.href).toBe('https://api.example.com/auth/login-brand.css?client_id=x')
  })

  it('falls back to same-origin when no base is configured', () => {
    const [link] = run({ search: '?client_id=x', scriptSrc: BASE_SRC })
    expect(link?.href!.startsWith('/auth/')).toBe(true)
  })

  it('stays silent when it cannot read its own src', () => {
    const [link] = run({ search: '?client_id=x' })
    expect(link?.href).toBe('/auth/login-brand.css?client_id=x')
  })
})
