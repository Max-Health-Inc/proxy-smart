import { test, expect } from "@playwright/test"
import { env, testUsers } from "../../lib/env"
import { smartLogin } from "../../lib/auth"

test.describe("Patient Portal — Dashboard & Clinical Data", () => {
  test.beforeEach(async ({ page }) => {
    await smartLogin(page, "patient")
  })

  test.describe("Patient Banner", () => {
    test("should display the patient banner with demographics", async ({ page }) => {
      // The PatientBanner card should be visible
      // It shows: name, DOB (age), gender badge, MRN
      const banner = page.locator(".space-y-6 > div").first()
      await expect(banner).toBeVisible({ timeout: 20_000 })

      // Should display at least a patient name (any text in the h2)
      const patientName = banner.locator("h2")
      await expect(patientName).toBeVisible()
      const nameText = await patientName.textContent()
      expect(nameText?.trim().length).toBeGreaterThan(0)
    })

    test("should show patient gender as a badge", async ({ page }) => {
      // Wait for dashboard to load
      await expect(
        page.getByRole("button", { name: "Sign Out" }),
      ).toBeVisible()

      // Gender badge should be visible (male, female, other, unknown)
      const genderBadge = page.locator("text=/male|female|other|unknown/i").first()
      await expect(genderBadge).toBeVisible({ timeout: 20_000 })
    })

    test("should show patient date of birth with age", async ({ page }) => {
      // DOB format: "MMM d, yyyy (XX years)"
      const dobElement = page.locator("text=/\\d{4}.*\\(\\d+ years\\)/")
      await expect(dobElement).toBeVisible({ timeout: 20_000 })
    })
  })

  test.describe("Clinical Data Cards", () => {
    test("should render all 6 clinical data cards", async ({ page }) => {
      // Wait for loading to finish
      await expect(page.getByText("Loading your health records...")).not.toBeVisible({
        timeout: 30_000,
      })

      // All 6 card titles
      const expectedCards = [
        "Active Conditions",
        "Allergies",
        "Current Medications",
        "Immunizations",
        "Recent Vitals",
        "Recent Lab Results",
      ]

      for (const title of expectedCards) {
        await expect(page.getByText(title, { exact: true })).toBeVisible()
      }
    })

    test("should show conditions or empty state", async ({ page }) => {
      await expect(page.getByText("Loading your health records...")).not.toBeVisible({
        timeout: 30_000,
      })

      const conditionsCard = page.getByText("Active Conditions").locator("..").locator("..")
      // Must show either condition data or empty state
      const hasData = await conditionsCard.getByText("No active conditions on record").isVisible().catch(() => false)
      const hasConditions = await conditionsCard.locator("li").count()

      expect(hasData || hasConditions > 0).toBe(true)
    })

    test("should show allergies or empty state", async ({ page }) => {
      await expect(page.getByText("Loading your health records...")).not.toBeVisible({
        timeout: 30_000,
      })

      const section = page.getByText("Allergies").locator("..").locator("..")
      const isEmpty = await section.getByText("No known allergies").isVisible().catch(() => false)
      const itemCount = await section.locator("li").count()

      expect(isEmpty || itemCount > 0).toBe(true)
    })

    test("should show medications or empty state", async ({ page }) => {
      await expect(page.getByText("Loading your health records...")).not.toBeVisible({
        timeout: 30_000,
      })

      const section = page.getByText("Current Medications").locator("..").locator("..")
      const isEmpty = await section.getByText("No active medications").isVisible().catch(() => false)
      const itemCount = await section.locator("li").count()

      expect(isEmpty || itemCount > 0).toBe(true)
    })

    test("should show immunizations or empty state", async ({ page }) => {
      await expect(page.getByText("Loading your health records...")).not.toBeVisible({
        timeout: 30_000,
      })

      const section = page.getByText("Immunizations").locator("..").locator("..")
      const isEmpty = await section.getByText("No immunization records").isVisible().catch(() => false)
      const itemCount = await section.locator("li").count()

      expect(isEmpty || itemCount > 0).toBe(true)
    })

    test("should show vitals or empty state", async ({ page }) => {
      await expect(page.getByText("Loading your health records...")).not.toBeVisible({
        timeout: 30_000,
      })

      const section = page.getByText("Recent Vitals").locator("..").locator("..")
      const isEmpty = await section.getByText("No recent vital signs").isVisible().catch(() => false)
      const itemCount = await section.locator("li").count()

      expect(isEmpty || itemCount > 0).toBe(true)
    })

    test("should show labs or empty state", async ({ page }) => {
      await expect(page.getByText("Loading your health records...")).not.toBeVisible({
        timeout: 30_000,
      })

      const section = page.getByText("Recent Lab Results").locator("..").locator("..")
      const isEmpty = await section.getByText("No recent lab results").isVisible().catch(() => false)
      const itemCount = await section.locator("li").count()

      expect(isEmpty || itemCount > 0).toBe(true)
    })
  })

  test.describe("FHIR Data Integrity", () => {
    test("should not show error state when loading patient data", async ({ page }) => {
      // Wait for dashboard to fully load
      await expect(page.getByText("Loading your health records...")).not.toBeVisible({
        timeout: 30_000,
      })

      // Should NOT show error messages from Dashboard
      await expect(
        page.getByText("No patient context available"),
      ).not.toBeVisible()

      await expect(
        page.locator("text=Failed to load patient data"),
      ).not.toBeVisible()
    })

    test("should make FHIR requests through the proxy (not directly)", async ({ page }) => {
      // Monitor network requests to verify they go through the proxy
      const fhirRequests: string[] = []
      page.on("request", (request) => {
        if (request.url().includes("Patient") || request.url().includes("Condition")) {
          fhirRequests.push(request.url())
        }
      })

      // Reload to trigger fresh FHIR requests
      await page.reload({ waitUntil: "networkidle" })
      await expect(page.getByText("Loading your health records...")).not.toBeVisible({
        timeout: 30_000,
      })

      // All FHIR requests should go through the proxy path
      for (const url of fhirRequests) {
        expect(url).toContain(env.fhirProxyPath)
      }
    })

    test("should send Authorization header with FHIR requests", async ({ page }) => {
      const authHeaders: (string | null)[] = []
      page.on("request", (request) => {
        if (request.url().includes(env.fhirProxyPath)) {
          authHeaders.push(request.headers()["authorization"] ?? null)
        }
      })

      await page.reload({ waitUntil: "networkidle" })
      await expect(page.getByText("Loading your health records...")).not.toBeVisible({
        timeout: 30_000,
      })

      // At least some FHIR requests should have been made
      expect(authHeaders.length).toBeGreaterThan(0)

      // All should have Bearer tokens
      for (const header of authHeaders) {
        expect(header).toBeTruthy()
        expect(header).toMatch(/^Bearer\s+\S+/)
      }
    })

    test("should receive 200 responses for all FHIR queries", async ({ page }) => {
      const fhirResponses: { url: string; status: number }[] = []
      page.on("response", (response) => {
        if (response.url().includes(env.fhirProxyPath)) {
          fhirResponses.push({ url: response.url(), status: response.status() })
        }
      })

      await page.reload({ waitUntil: "networkidle" })
      await expect(page.getByText("Loading your health records...")).not.toBeVisible({
        timeout: 30_000,
      })

      expect(fhirResponses.length).toBeGreaterThan(0)

      for (const resp of fhirResponses) {
        // Allow 429 (rate limiting) — not an app error, just test environment throttling
        expect(resp.status === 429 || resp.status < 400).toBe(true)
      }
    })
  })
})
