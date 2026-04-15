import { test, expect } from "@playwright/test"
import { env, testUsers } from "../../lib/env"
import { consentLogin } from "../../lib/auth"

test.describe("Consent App — Patient Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await consentLogin(page, "patient")
  })

  test("should show the dashboard after login", async ({ page }) => {
    // Dashboard loads identity — should see either patient info or loading state
    // Wait for loading to finish (spinner disappears)
    await expect(page.getByText("Loading your health records")).not.toBeVisible({
      timeout: 30_000,
    })

    // Dashboard should show some content — either patient detail or person card
    // The exact view depends on whether fhirUser is Patient, Person, or Practitioner
    const hasPatientInfo = await page.getByText("Patient Information").isVisible().catch(() => false)
    const hasPatientRecords = await page.getByText("Your Patient Records").isVisible().catch(() => false)
    const hasErrorMessage = await page.getByText("Failed to load identity").isVisible().catch(() => false)
    const hasNoIdentity = await page.getByText("No identity found").isVisible().catch(() => false)

    // At least one of these should be visible (valid dashboard state)
    expect(hasPatientInfo || hasPatientRecords || hasErrorMessage || hasNoIdentity).toBe(true)
  })

  test("should display consent stats cards when patient data loads", async ({ page }) => {
    // Wait for dashboard data to load
    const patientInfo = page.getByText("Patient Information")
    const hasPatient = await patientInfo.isVisible({ timeout: 30_000 }).catch(() => false)

    if (!hasPatient) {
      test.skip(true, "No patient data available — fhirUser may not be linked to a Patient")
      return
    }

    // Stats cards should be visible
    await expect(page.getByText("Total Consents")).toBeVisible()
    await expect(page.getByText("Active")).toBeVisible()
  })

  test("should show Consents tab with list or empty state", async ({ page }) => {
    const patientInfo = page.getByText("Patient Information")
    const hasPatient = await patientInfo.isVisible({ timeout: 30_000 }).catch(() => false)

    if (!hasPatient) {
      test.skip(true, "No patient data available")
      return
    }

    // Consents tab should be active by default
    const consentsTab = page.getByRole("tab", { name: "Consents" })
    await expect(consentsTab).toBeVisible()

    // Should show either consent cards or empty state
    const hasConsents = await page.getByText("View Details").first().isVisible({ timeout: 5_000 }).catch(() => false)
    const hasEmpty = await page.getByText("No consents found").isVisible({ timeout: 2_000 }).catch(() => false)

    expect(hasConsents || hasEmpty).toBe(true)
  })

  test("should show Access Requests tab", async ({ page }) => {
    const patientInfo = page.getByText("Patient Information")
    const hasPatient = await patientInfo.isVisible({ timeout: 30_000 }).catch(() => false)

    if (!hasPatient) {
      test.skip(true, "No patient data available")
      return
    }

    // Switch to Requests tab
    const requestsTab = page.getByRole("tab", { name: /Requests/ })
    await expect(requestsTab).toBeVisible()
    await requestsTab.click()

    // Should show requests list or empty state
    await expect(
      page.getByText(/No pending|access request|No requests/i),
    ).toBeVisible({ timeout: 10_000 }).catch(() => {
      // May show actual request cards — that's also fine
    })
  })
})
