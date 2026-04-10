import { test, expect } from "@playwright/test"
import { env } from "../../lib/env"
import { smartLogin, smartLogout } from "../../lib/auth"

test.describe("Patient Portal — SMART Auth Flow", () => {
  test.describe("Standalone Launch", () => {
    test("should display the sign-in page with branding", async ({ page }) => {
      await page.goto(env.patientPortalURL)

      // Should show the unauthenticated landing (h2 in content area, not h1 in header)
      await expect(page.locator("h2", { hasText: "Patient Portal" })).toBeVisible()
      await expect(
        page.getByRole("button", { name: "Sign In with SMART" }),
      ).toBeVisible()

      // Should show descriptive text
      await expect(
        page.getByText("Access your health records"),
      ).toBeVisible()
    })

    test("should redirect to Keycloak on sign-in click", async ({ page }) => {
      await page.goto(env.patientPortalURL, { waitUntil: "networkidle" })

      const signInButton = page.getByRole("button", { name: "Sign In with SMART" })
      await signInButton.click()

      // Should end up on Keycloak login page
      await expect(page.locator("#username")).toBeVisible({ timeout: 15_000 })
      await expect(page.locator("#password")).toBeVisible()
      await expect(page.locator("#kc-login")).toBeVisible()
    })

    test("should include PKCE code_challenge in authorization URL", async ({ page }) => {
      await page.goto(env.patientPortalURL, { waitUntil: "networkidle" })

      // Intercept the navigation to Keycloak to inspect the auth URL
      const [request] = await Promise.all([
        page.waitForRequest((req) =>
          req.url().includes("/protocol/openid-connect/auth"),
        ),
        page.getByRole("button", { name: "Sign In with SMART" }).click(),
      ])

      const url = new URL(request.url())
      expect(url.searchParams.get("code_challenge")).toBeTruthy()
      expect(url.searchParams.get("code_challenge_method")).toBe("S256")
      expect(url.searchParams.get("response_type")).toBe("code")
      expect(url.searchParams.get("client_id")).toBe("patient-portal")
    })

    test("should request correct SMART scopes in authorization URL", async ({ page }) => {
      await page.goto(env.patientPortalURL, { waitUntil: "networkidle" })

      const [request] = await Promise.all([
        page.waitForRequest((req) =>
          req.url().includes("/protocol/openid-connect/auth"),
        ),
        page.getByRole("button", { name: "Sign In with SMART" }).click(),
      ])

      const url = new URL(request.url())
      const scopes = url.searchParams.get("scope")?.split(" ") ?? []

      // Must include standard SMART scopes
      expect(scopes).toContain("openid")
      expect(scopes).toContain("fhirUser")
      expect(scopes).toContain("patient/*.read")
    })

    test("should complete full login and reach authenticated state", async ({ page }) => {
      await smartLogin(page, "patient")

      // Should be authenticated — sign out button visible
      await expect(
        page.getByRole("button", { name: "Sign Out" }),
      ).toBeVisible()

      // Should NOT show sign-in button
      await expect(
        page.getByRole("button", { name: "Sign In with SMART" }),
      ).not.toBeVisible()
    })

    test("should handle invalid credentials gracefully", async ({ page }) => {
      await page.goto(env.patientPortalURL, { waitUntil: "networkidle" })
      await page.getByRole("button", { name: "Sign In with SMART" }).click()

      // Wait for Keycloak login form
      await expect(page.locator("#username")).toBeVisible({ timeout: 15_000 })

      // Enter wrong credentials
      await page.locator("#username").fill("nonexistent_user")
      await page.locator("#password").fill("wrong_password")
      await page.locator("#kc-login").click()

      // Keycloak should show an error
      await expect(page.locator(".pf-v5-c-alert, .alert-error, #input-error, .kc-feedback-text")).toBeVisible({
        timeout: 10_000,
      })
    })
  })

  test.describe("Logout", () => {
    test("should logout and return to sign-in screen", async ({ page }) => {
      await smartLogin(page, "patient")
      await smartLogout(page)

      // After logout, should see sign-in button again
      await expect(
        page.getByRole("button", { name: "Sign In with SMART" }),
      ).toBeVisible()

      // Should NOT see sign out
      await expect(
        page.getByRole("button", { name: "Sign Out" }),
      ).not.toBeVisible()
    })

    test("should clear tokens on logout (no auto-restore)", async ({ page }) => {
      await smartLogin(page, "patient")
      await smartLogout(page)

      // Refresh the page — should NOT auto-login
      await page.reload({ waitUntil: "networkidle" })

      await expect(
        page.getByRole("button", { name: "Sign In with SMART" }),
      ).toBeVisible({ timeout: 10_000 })
    })

    test("should invalidate Keycloak session on logout (SSO logout)", async ({ page }) => {
      await smartLogin(page, "patient")
      await smartLogout(page)

      // Navigate back to patient portal and click sign in again
      await page.goto(env.patientPortalURL, { waitUntil: "networkidle" })
      await page.getByRole("button", { name: "Sign In with SMART" }).click()

      // Should require re-authentication at Keycloak (not silent SSO)
      // If SSO logout works, we should see the login form again
      await expect(page.locator("#username")).toBeVisible({ timeout: 15_000 })
    })
  })

  test.describe("Session Persistence", () => {
    test("should survive page refresh while authenticated", async ({ page }) => {
      await smartLogin(page, "patient")

      // Refresh
      await page.reload({ waitUntil: "networkidle" })

      // Should remain authenticated (token in localStorage)
      await expect(
        page.getByRole("button", { name: "Sign Out" }),
      ).toBeVisible({ timeout: 15_000 })
    })

    test("should redirect back to patient portal after login (clean URL)", async ({ page }) => {
      await smartLogin(page, "patient")

      // URL should not contain 'code' or 'state' params (cleaned up after callback)
      const url = new URL(page.url())
      expect(url.searchParams.has("code")).toBe(false)
      expect(url.searchParams.has("state")).toBe(false)
    })
  })
})
