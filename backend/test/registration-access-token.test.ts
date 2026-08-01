/**
 * Unit tests for the RFC 7592 registration access token.
 *
 * This is the credential that lets a dynamically-registered client delete itself, which is the
 * standards-sanctioned alternative to waiting for the reaper. It is a bearer credential for
 * exactly one client, so the properties worth pinning are that only a hash is ever persisted
 * and that comparison does not leak.
 */
import { describe, it, expect } from 'bun:test'
import {
  bearerToken,
  generateRegistrationAccessToken,
  hashRegistrationAccessToken,
  registrationTokenMatches,
} from '../src/lib/registration-access-token'

describe('generateRegistrationAccessToken', () => {
  it('produces a distinct high-entropy token each time', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateRegistrationAccessToken()))
    expect(tokens.size).toBe(50)
    // 32 random bytes, base64url — no padding, comfortably over 40 chars.
    for (const token of tokens) {
      expect(token.length).toBeGreaterThan(40)
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    }
  })
})

describe('registrationTokenMatches', () => {
  it('accepts the token that produced the stored hash', () => {
    const token = generateRegistrationAccessToken()
    expect(registrationTokenMatches(token, hashRegistrationAccessToken(token))).toBe(true)
  })

  it('rejects a different token', () => {
    const stored = hashRegistrationAccessToken(generateRegistrationAccessToken())
    expect(registrationTokenMatches(generateRegistrationAccessToken(), stored)).toBe(false)
  })

  it('rejects when no hash is stored, rather than treating absence as a match', () => {
    // A client with no registration token attribute must not be manageable by anyone.
    expect(registrationTokenMatches(generateRegistrationAccessToken(), undefined)).toBe(false)
    expect(registrationTokenMatches(generateRegistrationAccessToken(), '')).toBe(false)
  })

  it('rejects a malformed stored hash without throwing', () => {
    const token = generateRegistrationAccessToken()
    expect(registrationTokenMatches(token, 'not-hex')).toBe(false)
    expect(registrationTokenMatches(token, 'abcd')).toBe(false)
  })

  it('never stores the token itself', () => {
    const token = generateRegistrationAccessToken()
    const hash = hashRegistrationAccessToken(token)
    expect(hash).not.toContain(token)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('bearerToken', () => {
  it('reads a Bearer credential regardless of header casing', () => {
    expect(bearerToken({ authorization: 'Bearer abc123' })).toBe('abc123')
    expect(bearerToken({ Authorization: 'bearer abc123' })).toBe('abc123')
    expect(bearerToken({ authorization: 'Bearer   abc123  ' })).toBe('abc123')
  })

  it('ignores a non-Bearer or absent header', () => {
    expect(bearerToken({})).toBeUndefined()
    expect(bearerToken({ authorization: 'Basic abc123' })).toBeUndefined()
    expect(bearerToken({ authorization: 'Bearer' })).toBeUndefined()
    expect(bearerToken({ authorization: '' })).toBeUndefined()
  })
})
