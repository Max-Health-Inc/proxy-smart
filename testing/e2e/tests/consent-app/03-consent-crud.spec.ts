import { test, expect } from "@playwright/test"
import { env } from "../../lib/env"
import { consentLogin } from "../../lib/auth"

test.describe("Consent App — Create & Revoke Consent", () => {
  test.beforeEach(async ({ page }) => {
    await consentLogin(page, "patient")
    // Wait for patient detail to load
    const hasPatient = await page.getByText("Patient Information").isVisible({ timeout: 30_000 }).catch(() => false)
    if (!hasPatient) {
      test.skip(true, "No patient data available — cannot test consent creation")
    }
  })

  test("should open the consent builder wizard", async ({ page }) => {
    // Click "New Consent" button
    const newConsentBtn = page.getByRole("button", { name: "New Consent" })
    await expect(newConsentBtn).toBeVisible()
    await newConsentBtn.click()

    // Should show the consent builder wizard
    await expect(page.getByText("New Consent")).toBeVisible()
    await expect(page.getByText(/Step 1 of 4/)).toBeVisible()

    // First step: practitioner selection
    await expect(page.getByText("Select Practitioner")).toBeVisible()
  })

  test("should navigate through all 4 consent builder steps", async ({ page }) => {
    await page.getByRole("button", { name: "New Consent" }).click()
    await expect(page.getByText("Select Practitioner")).toBeVisible()

    // Step 1: Select a practitioner
    // Wait for practitioner list to load
    const practitionerButton = page.locator("button").filter({ hasText: /Dr\.|Practitioner|doctor/i }).first()
    const hasPractitioner = await practitionerButton.isVisible({ timeout: 10_000 }).catch(() => false)

    if (!hasPractitioner) {
      test.skip(true, "No practitioners available in FHIR server")
      return
    }

    await practitionerButton.click()

    // Click Next to go to step 2
    const nextButton = page.getByRole("button", { name: /Next/i })
    await expect(nextButton).toBeEnabled()
    await nextButton.click()

    // Step 2: Resource types
    await expect(page.getByText(/Step 2 of 4/)).toBeVisible()
    // Resource type checkboxes should be visible
    await expect(page.getByText("Observation")).toBeVisible()
    await expect(page.getByText("Condition")).toBeVisible()
    await nextButton.click()

    // Step 3: Period
    await expect(page.getByText(/Step 3 of 4/)).toBeVisible()
    await nextButton.click()

    // Step 4: Review
    await expect(page.getByText(/Step 4 of 4/)).toBeVisible()
    await expect(page.getByText(/Review/i)).toBeVisible()

    // Submit button should be visible
    await expect(
      page.getByRole("button", { name: /Create Consent|Submit|Confirm/i }),
    ).toBeVisible()
  })

  test("should create a consent and see it in the list", async ({ page }) => {
    await page.getByRole("button", { name: "New Consent" }).click()

    // Step 1: Select practitioner
    const practitionerButton = page.locator("button").filter({ hasText: /Dr\.|Practitioner|doctor/i }).first()
    const hasPractitioner = await practitionerButton.isVisible({ timeout: 10_000 }).catch(() => false)
    if (!hasPractitioner) {
      test.skip(true, "No practitioners available")
      return
    }
    await practitionerButton.click()
    await page.getByRole("button", { name: /Next/i }).click()

    // Step 2: Keep default resource types (Observation, Condition, MedicationRequest)
    await page.getByRole("button", { name: /Next/i }).click()

    // Step 3: Keep default period
    await page.getByRole("button", { name: /Next/i }).click()

    // Step 4: Submit
    const submitBtn = page.getByRole("button", { name: /Create Consent|Submit|Confirm/i })
    await expect(submitBtn).toBeVisible()
    await submitBtn.click()

    // Should return to consent list and show the new consent
    await expect(page.getByText("Consent created")).toBeVisible({ timeout: 10_000 })
    // Active badge should appear
    await expect(page.locator("text=Active").first()).toBeVisible({ timeout: 10_000 })
  })

  test("should revoke an active consent", async ({ page }) => {
    // Check if there are any active consents to revoke
    const revokeBtn = page.getByRole("button", { name: "Revoke" }).first()
    const hasRevoke = await revokeBtn.isVisible({ timeout: 10_000 }).catch(() => false)

    if (!hasRevoke) {
      test.skip(true, "No active consents to revoke")
      return
    }

    // Click revoke
    await revokeBtn.click()

    // Confirmation dialog should appear
    const confirmBtn = page.getByRole("button", { name: /Confirm|Revoke|Yes/i }).last()
    await expect(confirmBtn).toBeVisible({ timeout: 5_000 })
    await confirmBtn.click()

    // Should show a success notification or the consent status should change
    // Wait for either a toast or the consent to show as Revoked
    await expect(
      page.getByText(/revoked|inactive/i).first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test("should view consent details", async ({ page }) => {
    // Check for any consents
    const viewBtn = page.getByRole("button", { name: "View Details" }).first()
    const hasConsent = await viewBtn.isVisible({ timeout: 10_000 }).catch(() => false)

    if (!hasConsent) {
      test.skip(true, "No consents to view")
      return
    }

    await viewBtn.click()

    // Detail view should show consent info
    await expect(page.getByText(/Practitioner|Actor/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Period|Valid/i)).toBeVisible()

    // Should have a back button
    const backBtn = page.getByRole("button").filter({ has: page.locator("svg") }).first()
    await expect(backBtn).toBeVisible()
  })
})
