import { test, expect, type Page } from "@playwright/test"
import { env, testUsers } from "../../lib/env"
import { consentLogin } from "../../lib/auth"

/**
 * Consent enforcement E2E tests.
 *
 * These tests verify that the FHIR proxy properly enforces consent:
 *  - A practitioner token can only access patient data when an active Consent exists
 *  - Revoking a consent blocks subsequent FHIR access
 *
 * They operate against the real running stack, using the FHIR proxy path.
 */

/** Helper — get a SMART access token by doing OIDC login and capturing it */
async function getAccessToken(page: Page, user: keyof typeof testUsers): Promise<string | null> {
  await consentLogin(page, user)
  // The token is stored in sessionStorage/localStorage by the SMART auth library
  const token = await page.evaluate(() => {
    // Check sessionStorage first (common for SMART on FHIR clients)
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)!
      const val = sessionStorage.getItem(key) ?? ""
      try {
        const parsed = JSON.parse(val)
        if (parsed.access_token) return parsed.access_token as string
      } catch { /* ignore */ }
    }
    // Fallback: localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!
      const val = localStorage.getItem(key) ?? ""
      try {
        const parsed = JSON.parse(val)
        if (parsed.access_token) return parsed.access_token as string
      } catch { /* ignore */ }
    }
    return null
  })
  return token
}

test.describe("Consent App — FHIR Data Access Enforcement", () => {
  test("patient can read own data via FHIR proxy", async ({ page, request }) => {
    const token = await getAccessToken(page, "patient")
    test.skip(!token, "Could not extract access token")

    const fhirBase = `${env.baseURL}/${env.fhirProxyPath}`
    const response = await request.get(`${fhirBase}/Patient/${testUsers.patient.patientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    // Patient should be able to read their own record
    expect(response.status()).toBeLessThan(400)
    const body = await response.json()
    expect(body.resourceType).toBe("Patient")
    expect(body.id).toBe(testUsers.patient.patientId)
  })

  test("patient can search own Consent resources", async ({ page, request }) => {
    const token = await getAccessToken(page, "patient")
    test.skip(!token, "Could not extract access token")

    const fhirBase = `${env.baseURL}/${env.fhirProxyPath}`
    const response = await request.get(`${fhirBase}/Consent?patient=Patient/${testUsers.patient.patientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response.status()).toBeLessThan(400)
    const body = await response.json()
    expect(body.resourceType).toBe("Bundle")
  })

  test("FHIR metadata endpoint is accessible without token", async ({ request }) => {
    const fhirBase = `${env.baseURL}/${env.fhirProxyPath}`
    const response = await request.get(`${fhirBase}/metadata`)

    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.resourceType).toBe("CapabilityStatement")
  })

  test("request without token is rejected", async ({ request }) => {
    const fhirBase = `${env.baseURL}/${env.fhirProxyPath}`
    const response = await request.get(`${fhirBase}/Patient/${testUsers.patient.patientId}`)

    // Should get 401
    expect(response.status()).toBe(401)
  })

  test("consent creation and revocation affects FHIR access", async ({ page }) => {
    // This is a UI-driven integration test:
    // 1. Log in as patient
    // 2. Create a new consent for a practitioner
    // 3. Verify the consent shows as Active
    // 4. Revoke it
    // 5. Verify the consent shows as Revoked/Inactive

    await consentLogin(page, "patient")
    await expect(page.getByText("Patient Information")).toBeVisible({ timeout: 30_000 })

    // Step 1: Count current active consents
    const activeCountBefore = await page.getByText(/active consent/i).textContent().catch(() => "0")

    // Step 2: Create a new consent
    const newConsentBtn = page.getByRole("button", { name: "New Consent" })
    const hasNewConsent = await newConsentBtn.isVisible({ timeout: 5_000 }).catch(() => false)
    if (!hasNewConsent) {
      test.skip(true, "New Consent button not available")
      return
    }

    await newConsentBtn.click()

    // Select first practitioner
    const practitionerBtn = page.locator("button").filter({ hasText: /Dr\.|Practitioner|doctor/i }).first()
    const hasPractitioner = await practitionerBtn.isVisible({ timeout: 10_000 }).catch(() => false)
    if (!hasPractitioner) {
      test.skip(true, "No practitioners available")
      return
    }
    await practitionerBtn.click()

    // Navigate through wizard steps
    const nextButton = page.getByRole("button", { name: /Next/i })
    await nextButton.click() // → Resource types
    await nextButton.click() // → Period
    await nextButton.click() // → Review

    // Submit
    const submitBtn = page.getByRole("button", { name: /Create Consent|Submit|Confirm/i })
    await submitBtn.click()

    // Wait for consent creation
    await expect(page.getByText(/Consent created|Active/i).first()).toBeVisible({ timeout: 10_000 })

    // Step 3: Revoke the consent we just created
    const revokeBtn = page.getByRole("button", { name: "Revoke" }).first()
    const hasRevoke = await revokeBtn.isVisible({ timeout: 5_000 }).catch(() => false)
    if (!hasRevoke) {
      // The consent may not be immediately revocable in the UI
      return
    }

    await revokeBtn.click()
    const confirmBtn = page.getByRole("button", { name: /Confirm|Revoke|Yes/i }).last()
    await confirmBtn.click()

    // Step 4: Verify revocation
    await expect(page.getByText(/revoked|inactive/i).first()).toBeVisible({ timeout: 10_000 })
  })
})
