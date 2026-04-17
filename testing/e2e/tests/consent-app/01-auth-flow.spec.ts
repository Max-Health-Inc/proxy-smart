import { test, expect } from "@playwright/test"
import { env } from "../../lib/env"
import { consentLogin, keycloakLogin } from "../../lib/auth"

test.describe("Consent App — SMART Auth Flow", () => {
  test("should display the unauthenticated landing page", async ({ page }) => {
    await page.goto(env.consentAppURL)

    await expect(page.locator("h2", { hasText: "Consent Manager" })).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Sign In with SMART" }),
    ).toBeVisible()
  })

  test("should redirect to Keycloak with correct client_id and PKCE", async ({ page }) => {
    await page.goto(env.consentAppURL, { waitUntil: "networkidle" })

    const [request] = await Promise.all([
      page.waitForRequest((req) =>
        req.url().includes("/protocol/openid-connect/auth"),
      ),
      page.getByRole("button", { name: "Sign In with SMART" }).click(),
    ])

    const url = new URL(request.url())
    expect(url.searchParams.get("client_id")).toBe("consent-app")
    expect(url.searchParams.get("response_type")).toBe("code")
    expect(url.searchParams.get("code_challenge")).toBeTruthy()
    expect(url.searchParams.get("code_challenge_method")).toBe("S256")

    // Consent app requires fhirUser + patient scopes
    const scopes = url.searchParams.get("scope")?.split(" ") ?? []
    expect(scopes).toContain("openid")
    expect(scopes).toContain("fhirUser")
  })

  test("should complete login and reach authenticated dashboard", async ({ page }) => {
    await consentLogin(page, "patient")

    // Should be authenticated — header shows Consent Manager + Sign Out
    await expect(page.getByRole("button", { name: "Sign Out" })).toBeVisible()

    // Should NOT show sign-in button
    await expect(
      page.getByRole("button", { name: "Sign In with SMART" }),
    ).not.toBeVisible()
  })

  test("should handle invalid credentials", async ({ page }) => {
    await page.goto(env.consentAppURL, { waitUntil: "networkidle" })
    await page.getByRole("button", { name: "Sign In with SMART" }).click()

    await expect(page.locator("#username")).toBeVisible({ timeout: 15_000 })
    await page.locator("#username").fill("bad_user")
    await page.locator("#password").fill("bad_pass")
    await page.locator("#kc-login").click()

    // Keycloak error feedback
    await expect(
      page.locator(".pf-v5-c-alert, .alert-error, #input-error, .kc-feedback-text"),
    ).toBeVisible({ timeout: 10_000 })
  })

  test("should logout and return to unauthenticated state", async ({ page }) => {
    await consentLogin(page, "patient")
    await expect(page.getByRole("button", { name: "Sign Out" })).toBeVisible()

    await page.getByRole("button", { name: "Sign Out" }).click()
    await expect(
      page.getByRole("button", { name: "Sign In with SMART" }),
    ).toBeVisible({ timeout: 15_000 })
  })
})
