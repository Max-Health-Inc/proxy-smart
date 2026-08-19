import { describe, expect, it } from 'bun:test'
import { isCssColor, safeCssColor } from '../src/lib/brand-color'

describe('isCssColor', () => {
  it('accepts hex in every CSS length', () => {
    for (const hex of ['#fff', '#ffff', '#00d294', '#00d294ff']) {
      expect(isCssColor(hex)).toBe(true)
    }
  })

  it('accepts the functional notations', () => {
    for (const fn of [
      'rgb(0, 210, 148)',
      'rgba(0, 210, 148, 0.5)',
      'rgb(0 210 148 / 50%)',
      'hsl(165, 100%, 41%)',
      'hsla(165 100% 41% / 0.5)',
    ]) {
      expect(isCssColor(fn)).toBe(true)
    }
  })

  it('accepts a bare keyword', () => {
    expect(isCssColor('rebeccapurple')).toBe(true)
    expect(isCssColor('transparent')).toBe(true)
  })

  it('rejects a value that closes the rule and opens its own', () => {
    expect(isCssColor('#000; } body { display: none } :root {')).toBe(false)
    expect(isCssColor('red }')).toBe(false)
    expect(isCssColor('red;')).toBe(false)
  })

  it('rejects comments, at-rules and url()', () => {
    expect(isCssColor('red /* x */')).toBe(false)
    expect(isCssColor('url(https://evil.example/x.png)')).toBe(false)
    expect(isCssColor('@import "evil.css"')).toBe(false)
  })

  it('rejects nested functions and custom properties', () => {
    expect(isCssColor('var(--x)')).toBe(false)
    expect(isCssColor('color-mix(in srgb, red 50%, blue)')).toBe(false)
    expect(isCssColor('rgb(calc(1 + 1), 0, 0)')).toBe(false)
  })

  it('rejects malformed hex', () => {
    expect(isCssColor('#')).toBe(false)
    expect(isCssColor('#12')).toBe(false)
    expect(isCssColor('#12345')).toBe(false)
    expect(isCssColor('#gggggg')).toBe(false)
  })

  it('rejects empty, whitespace and non-strings', () => {
    expect(isCssColor('')).toBe(false)
    expect(isCssColor('   ')).toBe(false)
    expect(isCssColor(null)).toBe(false)
    expect(isCssColor(undefined)).toBe(false)
    expect(isCssColor(123)).toBe(false)
  })

  it('rejects a value long enough to be a payload rather than a colour', () => {
    expect(isCssColor('a'.repeat(64))).toBe(false)
  })

  it('tolerates surrounding whitespace', () => {
    expect(isCssColor('  #00d294  ')).toBe(true)
  })
})

describe('safeCssColor', () => {
  it('returns the trimmed colour when valid', () => {
    expect(safeCssColor('  #00d294 ')).toBe('#00d294')
  })

  it('returns null for anything it would not emit', () => {
    expect(safeCssColor('#000; } html { }')).toBeNull()
    expect(safeCssColor(null)).toBeNull()
    expect(safeCssColor('')).toBeNull()
  })
})
