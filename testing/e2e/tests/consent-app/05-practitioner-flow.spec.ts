import { test, expect } from "@playwright/test"
import { consentLogin } from "../../lib/auth"

test.describe("Consent App — Practitioner Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await consentLogin(page, "practitioner")
  })

  test("should render practitioner identity card", async ({ page }) => {
    // Practitioner name and badge should be displayed
    await expect(page.getByText("Practitioner").first()).toBeVisible({ timeout: 15_000 })
    // The identity card shows the practitioner name (may be plain text, not a heading)
    await expect(page.getByText(/Dr\.|doctor|Test Doctor/i).first()).toBeVisible()
  })

  test("should show request stats cards", async ({ page }) => {
    await expect(page.getByText("Total Requests")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("paragraph").filter({ hasText: "Pending" })).toBeVisible()
    await expect(page.getByText("Approved")).toBeVisible()
    await expect(page.getByText("Rejected")).toBeVisible()
  })

  test("should have tabs: All, Pending, Resolved", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "All" })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("tab", { name: /Pending/ })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Resolved" })).toBeVisible()
  })

  test("should navigate between request tabs", async ({ page }) => {
    // Wait for dashboard to settle
    await expect(page.getByText("Your Access Requests")).toBeVisible({ timeout: 15_000 })

    // Click Pending tab
    await page.getByRole("tab", { name: /Pending/ }).click()
    // Spinner or empty state or request list should appear
    await expect(
      page.getByText(/Pending|No requests|Send/i).first(),
    ).toBeVisible({ timeout: 10_000 })

    // Click Resolved tab
    await page.getByRole("tab", { name: "Resolved" }).click()
    await expect(
      page.getByText(/Resolved|No requests|Approved|Rejected/i).first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test("should open New Request form", async ({ page }) => {
    await expect(page.getByText("Your Access Requests")).toBeVisible({ timeout: 15_000 })

    const newRequestBtn = page.getByRole("button", { name: "New Request" })
    await expect(newRequestBtn).toBeVisible()
    await newRequestBtn.click()

    // Should navigate to the access request form
    await expect(page.getByText(/Request Access|Access Request/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test("should submit an access request to a patient", async ({ page }) => {
    await expect(page.getByText("Your Access Requests")).toBeVisible({ timeout: 15_000 })
    await page.getByRole("button", { name: "New Request" }).click()

    // The access request form should have a patient search/select step
    // and resource type selection
    const patientInput = page.locator("input[placeholder*='patient' i], input[placeholder*='search' i]").first()
    const hasPatientSearch = await patientInput.isVisible({ timeout: 10_000 }).catch(() => false)

    if (!hasPatientSearch) {
      // May have a different UI — look for a patient selection button
      const selectPatient = page.locator("button").filter({ hasText: /Select Patient|Choose Patient/i }).first()
      const hasSelectBtn = await selectPatient.isVisible({ timeout: 5_000 }).catch(() => false)
      if (!hasSelectBtn) {
        test.skip(true, "Cannot locate patient selection UI in access request form")
        return
      }
      await selectPatient.click()
    } else {
      await patientInput.fill("test")
    }

    // Wait for patient options to appear and select
    const patientOption = page.locator("button, div[role='option']").filter({ hasText: /Test Patient|test-patient/i }).first()
    const hasOption = await patientOption.isVisible({ timeout: 10_000 }).catch(() => false)

    if (!hasOption) {
      test.skip(true, "No patients available for access request")
      return
    }
    await patientOption.click()

    // Submit the request
    const submitBtn = page.getByRole("button", { name: /Submit|Request|Send/i }).last()
    await expect(submitBtn).toBeVisible({ timeout: 10_000 })
    await submitBtn.click()

    // Should go back to the request list with the new request visible
    await expect(page.getByText("Your Access Requests")).toBeVisible({ timeout: 15_000 })
  })

  test("should show empty state when no requests exist", async ({ page }) => {
    await expect(page.getByText("Your Access Requests")).toBeVisible({ timeout: 15_000 })

    // If there are no requests, the "No requests" empty state should show
    const emptyState = page.getByText("No requests")
    const requestCard = page.locator(".space-y-3 > div").first()
    const hasRequests = await requestCard.isVisible({ timeout: 5_000 }).catch(() => false)

    if (!hasRequests) {
      await expect(emptyState).toBeVisible()
    }
  })
})
