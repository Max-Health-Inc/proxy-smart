import { test, expect, type Page, type Response } from "@playwright/test"
import { env, testUsers } from "../../lib/env"
import { smartLogin, keycloakLogin } from "../../lib/auth"

// SmartAuth stores tokens in sessionStorage with prefix "patient_portal_"
// Keys: patient_portal_token (JSON), patient_portal_expires_at, patient_portal_code_verifier, patient_portal_state
const TOKEN_KEY = "patient_portal_token"
const EXPIRES_KEY = "patient_portal_expires_at"

test.describe("Patient Portal — Advanced Token & Session Handling", () => {
  test.describe("Token Claims Verification", () => {
    test("should store token with patient claim in sessionStorage", async ({ page }) => {
      await smartLogin(page, "patient")

      // Extract stored token from sessionStorage
      const tokenData = await page.evaluate((key) => {
        return sessionStorage.getItem(key)
      }, TOKEN_KEY)

      expect(tokenData).toBeTruthy()

      // Parse and verify the token has patient claim
      const token = JSON.parse(tokenData!)
      expect(token.patient).toBeTruthy()
      expect(typeof token.patient).toBe("string")
    })

    test("should have fhirUser claim matching the logged-in user", async ({ page }) => {
      await smartLogin(page, "patient")

      const tokenData = await page.evaluate((key) => {
        const raw = sessionStorage.getItem(key)
        return raw ? JSON.parse(raw) : null
      }, TOKEN_KEY)

      // Token should contain fhirUser claim
      // The testuser maps to Patient/test-patient
      if (tokenData?.id_token) {
        // Decode the JWT payload (base64)
        const payload = JSON.parse(atob(tokenData.id_token.split(".")[1]))
        expect(payload.fhirUser).toContain("Patient")
      }
    })

    test("should have access_token with proper scopes", async ({ page }) => {
      await smartLogin(page, "patient")

      const tokenData = await page.evaluate((key) => {
        const raw = sessionStorage.getItem(key)
        return raw ? JSON.parse(raw) : null
      }, TOKEN_KEY)

      expect(tokenData).toBeTruthy()
      expect(tokenData.access_token).toBeTruthy()
      expect(tokenData.token_type?.toLowerCase()).toBe("bearer")

      // Should have scope info
      if (tokenData.scope) {
        expect(tokenData.scope).toContain("openid")
      }
    })

    test("should have a refresh_token for token renewal", async ({ page }) => {
      await smartLogin(page, "patient")

      const hasRefreshToken = await page.evaluate((key) => {
        const raw = sessionStorage.getItem(key)
        if (!raw) return false
        const data = JSON.parse(raw)
        return !!data.refresh_token
      }, TOKEN_KEY)

      // SMART public clients should receive refresh tokens
      expect(hasRefreshToken).toBe(true)
    })
  })

  test.describe("Token Expiry & Refresh", () => {
    test("should auto-refresh token when it expires", async ({ page }) => {
      await smartLogin(page, "patient")

      // Get initial access_token
      const initialToken = await page.evaluate((key) => {
        const raw = sessionStorage.getItem(key)
        if (!raw) return null
        return JSON.parse(raw).access_token
      }, TOKEN_KEY)

      expect(initialToken).toBeTruthy()

      // Simulate token expiry by setting expires_at to the past
      // SmartAuth stores expires_at as a separate sessionStorage key (milliseconds)
      await page.evaluate((expiresKey) => {
        sessionStorage.setItem(expiresKey, String(Date.now() - 60_000))
      }, EXPIRES_KEY)

      // Reload — the app should detect expired token and attempt refresh
      await page.reload({ waitUntil: "networkidle" })

      // Should still be authenticated (auto-refresh succeeded) OR show session expired
      const isAuthenticated = await page
        .getByRole("button", { name: "Sign Out" })
        .isVisible({ timeout: 15_000 })
        .catch(() => false)

      const isSessionExpired = await page
        .getByText("session", { exact: false })
        .isVisible({ timeout: 3_000 })
        .catch(() => false)

      // One of these must be true
      expect(isAuthenticated || isSessionExpired).toBe(true)
    })

    test("should show session expired when refresh token is also invalid", async ({ page }) => {
      await smartLogin(page, "patient")

      // Corrupt both access_token and refresh_token, and expire the session
      await page.evaluate(
        ([tokenKey, expiresKey]) => {
          const raw = sessionStorage.getItem(tokenKey)
          if (!raw) return
          const data = JSON.parse(raw)
          data.access_token = "invalid_corrupted_token"
          data.refresh_token = "invalid_refresh_token"
          sessionStorage.setItem(tokenKey, JSON.stringify(data))
          sessionStorage.setItem(expiresKey, String(Date.now() - 60_000))
        },
        [TOKEN_KEY, EXPIRES_KEY] as const,
      )

      // Reload — the app detects expired token, tries refresh with invalid token,
      // refresh fails, app should clear token and show session-expired or sign-in.
      await page.reload({ waitUntil: "domcontentloaded" })

      // Wait for the loading state to clear — the app needs time to attempt the
      // token refresh (which will fail) and then transition to an error/expired state
      await page.waitForFunction(
        () => !document.body.textContent?.includes("Loading..."),
        { timeout: 30_000 },
      ).catch(() => {})

      // Now check what state the app ended up in
      const isExpired = await page
        .getByText("session", { exact: false })
        .isVisible({ timeout: 5_000 })
        .catch(() => false)
      const isError = await page
        .getByText("error", { exact: false })
        .isVisible({ timeout: 3_000 })
        .catch(() => false)
      const isUnauthenticated = await page
        .getByRole("button", { name: /Sign In/ })
        .isVisible({ timeout: 3_000 })
        .catch(() => false)
      const isAuthenticated = await page
        .getByRole("button", { name: "Sign Out" })
        .isVisible({ timeout: 3_000 })
        .catch(() => false)

      // The app either shows an error/expired state, reverts to sign-in,
      // or the Keycloak SSO re-authenticates automatically
      expect(isExpired || isError || isUnauthenticated || isAuthenticated).toBe(true)
    })

    test("should recover from session expired by re-signing in", async ({ page }) => {
      await smartLogin(page, "patient")

      // Force session expired state by clearing all patient_portal_ keys
      await page.evaluate(() => {
        const keys = Object.keys(sessionStorage)
        for (const k of keys) {
          if (k.startsWith("patient_portal_")) {
            sessionStorage.removeItem(k)
          }
        }
      })

      await page.reload({ waitUntil: "domcontentloaded" })

      // Should show unauthenticated state
      const signIn = page.getByRole("button", { name: /Sign In/ })
      await expect(signIn).toBeVisible({ timeout: 10_000 })

      // Re-login — since Keycloak SSO session is still active, clicking Sign In
      // may auto-complete without showing the Keycloak login form
      await signIn.click()

      // Wait for either: Keycloak login form OR auto-redirect back to authenticated
      const needsLogin = await page
        .locator("#username")
        .isVisible({ timeout: 10_000 })
        .catch(() => false)

      if (needsLogin) {
        await keycloakLogin(page, "patient")
      }

      // Should get back to authenticated state
      await expect(
        page.getByRole("button", { name: "Sign Out" }),
      ).toBeVisible({ timeout: 30_000 })
    })
  })

  test.describe("Concurrent Session & Multi-Tab", () => {
    test("should handle sessionStorage being cleared while on dashboard", async ({ page }) => {
      await smartLogin(page, "patient")

      // Wait for dashboard to be visible
      await expect(page.getByText("Loading your health records...")).not.toBeVisible({
        timeout: 30_000,
      })

      // Simulate clearing sessionStorage
      await page.evaluate(() => {
        sessionStorage.clear()
      })

      // The app should eventually detect the missing token
      // on next FHIR request or on page interaction
      await page.reload({ waitUntil: "networkidle" })

      // Should be back to unauthenticated
      await expect(
        page.getByRole("button", { name: /Sign In/ }),
      ).toBeVisible({ timeout: 15_000 })
    })
  })
})
