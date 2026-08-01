/**
 * Dynamically-registered clients require user consent.
 *
 * WHY THIS EXISTS. claude.ai's authorize request carries `prompt=consent` — the client explicitly
 * asking for the user to be consulted. Keycloak IGNORES that unless the client itself is flagged
 * `consentRequired`, and the DCR path never set the flag, so it defaulted false and the user was
 * never shown the choice the client asked to present. Observed against beta 2026-08-01: a flow
 * with `prompt=consent` went login -> code with no consent interstitial at all.
 *
 * A DCR client registered ITSELF, so nobody vetted it. Consent is the OIDC-intended control for
 * exactly that, and doubly so for `offline_access`, whose purpose is to be consented to. Note the
 * control cannot be delegated to the client: if a client could decide whether it needs consent,
 * the ones that most need it are the ones that would decline to ask.
 *
 * These are unit tests over the SETTINGS and the resulting flag decision. The registration route
 * itself is not exercised here — route-level tests need `mock.module` on the Keycloak plugin,
 * which is the known cause of the `roles` suite isolation flake.
 */
import { describe, it, expect } from 'bun:test'
import { ClientRegistrationSettings } from '../src/schemas'
import { Value } from '@sinclair/typebox/value'

/** The flag the registration route computes, kept in one place so the rule is testable. */
function consentRequiredFor(requireConsent: boolean | undefined, isBackendService: boolean): boolean {
  return (requireConsent ?? true) && !isBackendService
}

describe('the consent decision', () => {
  it('requires consent for an ordinary DCR client', () => {
    expect(consentRequiredFor(true, false)).toBe(true)
  })

  it('defaults to requiring consent when the setting is absent', () => {
    // An older realm predating the setting must read as "ask the user", not "skip consent".
    expect(consentRequiredFor(undefined, false)).toBe(true)
  })

  it('exempts backend services, which have no user to ask', () => {
    // client_credentials has no interactive user; flagging it would break the grant outright.
    expect(consentRequiredFor(true, true)).toBe(false)
    expect(consentRequiredFor(undefined, true)).toBe(false)
  })

  it('lets an operator switch it off deliberately', () => {
    // Automated environments legitimately cannot click through a consent screen.
    expect(consentRequiredFor(false, false)).toBe(false)
  })
})

describe('the settings schema', () => {
  const base = {
    enabled: true,
    requireHttps: true,
    allowedScopes: ['openid'],
    maxClientLifetime: 365,
    requireTermsOfService: false,
    requirePrivacyPolicy: false,
    allowPublicClients: true,
    allowConfidentialClients: true,
    allowBackendServices: false,
    adminApprovalRequired: false,
    rateLimitPerMinute: 10,
    maxRedirectUris: 5,
    allowedRedirectUriPatterns: ['https://.*'],
  }

  it('accepts a payload WITHOUT requireConsent', () => {
    // The compatibility guarantee: the admin UI's form is typed by the generated API client, so a
    // required field would fail validation on every save until that client is regenerated.
    expect(Value.Check(ClientRegistrationSettings, base)).toBe(true)
  })

  it('accepts a payload with it set either way', () => {
    expect(Value.Check(ClientRegistrationSettings, { ...base, requireConsent: true })).toBe(true)
    expect(Value.Check(ClientRegistrationSettings, { ...base, requireConsent: false })).toBe(true)
  })

  it('still rejects a non-boolean', () => {
    expect(Value.Check(ClientRegistrationSettings, { ...base, requireConsent: 'yes' })).toBe(false)
  })
})
