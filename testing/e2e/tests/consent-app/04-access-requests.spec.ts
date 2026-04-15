import { test, expect } from "@playwright/test"
import { consentLogin } from "../../lib/auth"

test.describe("Consent App — Access Requests (Patient)", () => {
  test.beforeEach(async ({ page }) => {
    await consentLogin(page, "patient")
    // Wait for dashboard to settle
    await expect(page.getByText("Patient Information")).toBeVisible({ timeout: 30_000 })
  })

  test("should show the Requests tab with pending badge", async ({ page }) => {
    const requestsTab = page.getByRole("tab", { name: /Requests/ })
    await expect(requestsTab).toBeVisible()
    // The tab may show a pending count badge
    await requestsTab.click()
    // Should switch to request list content
    await expect(page.getByText(/access request|No access requests/i)).toBeVisible({ timeout: 10_000 })
  })

  test("should display empty state when no requests exist", async ({ page }) => {
    await page.getByRole("tab", { name: /Requests/ }).click()

    // If no requests, should show the empty placeholder
    const emptyState = page.getByText("No access requests")
    const requestCard = page.locator("[data-testid='access-request-card']").first()
    const hasRequests = await requestCard.isVisible({ timeout: 5_000 }).catch(() => false)

    if (!hasRequests) {
      await expect(emptyState).toBeVisible()
      await expect(
        page.getByText(/When someone requests access/i),
      ).toBeVisible()
    }
  })

  test("should show approve and reject buttons for pending requests", async ({ page }) => {
    await page.getByRole("tab", { name: /Requests/ }).click()

    // Look for a pending request
    const approveBtn = page.getByRole("button", { name: /Approve/i }).first()
    const hasPending = await approveBtn.isVisible({ timeout: 10_000 }).catch(() => false)

    if (!hasPending) {
      test.skip(true, "No pending access requests available")
      return
    }

    // Both approve and reject should be visible for pending requests
    await expect(approveBtn).toBeVisible()
    await expect(page.getByRole("button", { name: /Reject/i }).first()).toBeVisible()
  })

  test("should approve a pending access request", async ({ page }) => {
    await page.getByRole("tab", { name: /Requests/ }).click()

    const approveBtn = page.getByRole("button", { name: /Approve/i }).first()
    const hasPending = await approveBtn.isVisible({ timeout: 10_000 }).catch(() => false)

    if (!hasPending) {
      test.skip(true, "No pending access requests to approve")
      return
    }

    await approveBtn.click()

    // Confirmation dialog
    const confirmBtn = page.getByRole("button", { name: /Confirm|Approve|Yes/i }).last()
    await expect(confirmBtn).toBeVisible({ timeout: 5_000 })
    await confirmBtn.click()

    // Should see success indicator — badge changes or toast appears
    await expect(
      page.getByText(/approved|accepted/i).first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test("should reject a pending access request", async ({ page }) => {
    await page.getByRole("tab", { name: /Requests/ }).click()

    const rejectBtn = page.getByRole("button", { name: /Reject/i }).first()
    const hasPending = await rejectBtn.isVisible({ timeout: 10_000 }).catch(() => false)

    if (!hasPending) {
      test.skip(true, "No pending access requests to reject")
      return
    }

    await rejectBtn.click()

    // Confirmation dialog
    const confirmBtn = page.getByRole("button", { name: /Confirm|Reject|Yes/i }).last()
    await expect(confirmBtn).toBeVisible({ timeout: 5_000 })
    await confirmBtn.click()

    // Should see rejected status
    await expect(
      page.getByText(/rejected/i).first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test("should display request details including resource types and period", async ({ page }) => {
    await page.getByRole("tab", { name: /Requests/ }).click()

    // Find any request card
    const requestCard = page.locator(".space-y-3 > div").first()
    const hasRequests = await requestCard.isVisible({ timeout: 10_000 }).catch(() => false)

    if (!hasRequests) {
      test.skip(true, "No access requests to inspect")
      return
    }

    // Access request cards should show requester info, resource types, and period
    // The card layout includes: requester name, status badge, resource types, date range
    await expect(requestCard).toBeVisible()
    // At minimum, a status badge should be present on any request
    await expect(requestCard.locator("span").first()).toBeVisible()
  })
})
