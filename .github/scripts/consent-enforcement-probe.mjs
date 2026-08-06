#!/usr/bin/env node
/**
 * Production enforcement probe.
 *
 * Asserts the properties that belong to THIS deployment rather than to the build,
 * and writes nothing. Consent enforcement is the reason it exists: it cannot be
 * proven on beta, because it depends on the deployed CONSENT_ENABLED/CONSENT_MODE,
 * on this realm and on this data — and it fails silently, since audit-only logs
 * the denial and then serves the record anyway.
 *
 * Authenticates with private_key_jwt, not a password: every client this codebase
 * provisions has directAccessGrantsEnabled=false, so a password grant is not an
 * option (see registerJwksForClient in routes/admin/smart-apps.ts).
 */
import { createSign, createPrivateKey, randomUUID } from 'crypto'
import { appendFileSync } from 'fs'

const {
  BACKEND_URL, FHIR_URL, KC_URL, KC_REALM,
  PROBE_CLIENT_ID, PROBE_PATIENT_ID, PROBE_PRIVATE_KEY, PROBE_KID,
  GITHUB_STEP_SUMMARY,
} = process.env

const failures = []
const pass = (m) => console.log(`  PASS: ${m}`)
const fail = (m) => { console.log(`::error::${m}`); failures.push(m) }

const timeout = (ms) => AbortSignal.timeout(ms)

// ── 1. FHIR reachable ────────────────────────────────────────────────────────
// /metadata short-circuits before auth and consent, but still opens the upstream
// connection — the cheapest signal that the backend can reach its database.
try {
  const r = await fetch(`${FHIR_URL}/metadata`, { signal: timeout(30_000) })
  const body = await r.json().catch(() => ({}))
  if (r.status === 200 && body.resourceType === 'CapabilityStatement') {
    pass('/metadata returned a CapabilityStatement')
  } else {
    fail(`/metadata returned HTTP ${r.status} (expected 200 CapabilityStatement)`)
  }
} catch (e) {
  fail(`/metadata unreachable: ${e.message}`)
}

// ── 2. Issuer is self-consistent ─────────────────────────────────────────────
// Guards split-brain issuers: Keycloak derives scheme and port from the request
// unless KC_HOSTNAME pins a full URL, and a wrong iss is rejected by every client.
try {
  const r = await fetch(`${KC_URL}/realms/${KC_REALM}/.well-known/openid-configuration`, { signal: timeout(30_000) })
  const { issuer } = await r.json()
  const expected = `${KC_URL}/realms/${KC_REALM}`
  if (issuer === expected) pass(`issuer is ${issuer}`)
  else fail(`issuer is '${issuer}', expected '${expected}'`)
} catch (e) {
  fail(`could not read openid-configuration: ${e.message}`)
}

// ── 3. Unauthenticated reads refused ─────────────────────────────────────────
try {
  const r = await fetch(`${FHIR_URL}/Patient/${PROBE_PATIENT_ID}`, { signal: timeout(30_000) })
  if (r.status === 401 || r.status === 403) pass(`unauthenticated read returned ${r.status}`)
  else fail(`unauthenticated read returned ${r.status} (expected 401/403)`)
} catch (e) {
  fail(`unauthenticated read failed: ${e.message}`)
}

// ── 4. Consent is ENFORCED, not merely audited ───────────────────────────────
function clientAssertion() {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const signingInput = [
    b64({ alg: 'RS384', typ: 'JWT', kid: PROBE_KID }),
    b64({
      iss: PROBE_CLIENT_ID, sub: PROBE_CLIENT_ID,
      aud: `${BACKEND_URL}/auth/token`,
      jti: randomUUID(), iat: now, exp: now + 300,
    }),
  ].join('.')
  const sig = createSign('RSA-SHA384')
    .update(signingInput)
    .sign(createPrivateKey(PROBE_PRIVATE_KEY))
    .toString('base64url')
  return `${signingInput}.${sig}`
}

try {
  const tokenRes = await fetch(`${BACKEND_URL}/auth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientAssertion(),
      scope: 'system/Patient.read',
    }),
    signal: timeout(30_000),
  })
  const tok = await tokenRes.json().catch(() => ({}))

  if (!tok.access_token) {
    fail(`could not obtain a token (${tokenRes.status} ${tok.error_description || tok.error || ''}) — the probe identity is broken, so enforcement is UNVERIFIED`)
  } else {
    pass(`obtained a token for ${PROBE_CLIENT_ID}`)

    // This patient is never created. Consent is evaluated before the request is
    // proxied upstream, so with no Consent resource the only correct answer is
    // 403. A 404 means it reached the FHIR server, i.e. consent did NOT block it
    // — exactly the regression this exists to catch.
    const r = await fetch(`${FHIR_URL}/Patient/${PROBE_PATIENT_ID}`, {
      headers: { authorization: `Bearer ${tok.access_token}` },
      signal: timeout(30_000),
    })
    const body = await r.json().catch(() => ({}))
    const denied = ['consent_denied', 'ial_verification_failed'].includes(body.error)

    if (r.status === 403 && denied) {
      pass(`access without consent was denied (403 ${body.error})`)
    } else if (r.status === 403) {
      fail(`got 403 but error was '${body.error}' — expected consent_denied, so the denial came from something other than consent`)
    } else {
      fail(`access without consent returned HTTP ${r.status}, expected 403 consent_denied. Consent is NOT enforced here (check CONSENT_ENABLED / CONSENT_MODE).`)
    }
  }
} catch (e) {
  fail(`enforcement check failed: ${e.message}`)
}

// ── Result ───────────────────────────────────────────────────────────────────
const summary = failures.length
  ? `## Production Enforcement Probe - FAILED (${failures.length})\n\n${failures.map((f) => `- ${f}`).join('\n')}\n`
  : '## Production Enforcement Probe - PASSED\n\nConsent enforcement, issuer consistency and FHIR reachability verified. Nothing was written.\n'

if (GITHUB_STEP_SUMMARY) appendFileSync(GITHUB_STEP_SUMMARY, summary)
console.log(`\n${summary}`)
process.exit(failures.length ? 1 : 0)
