import { type Page, expect } from "@playwright/test"
import { env, testUsers } from "./env"

/**
 * Performs Keycloak login on the current page.
 * Expects the page to be on the Keycloak login form.
 */
export async function keycloakLogin(
  page: Page,
  user: keyof typeof testUsers = "patient",
): Promise<void> {
  const creds = testUsers[user]

  // Wait for the Keycloak login form
  const usernameField = page.locator("#username")
  await expect(usernameField).toBeVisible({ timeout: 15_000 })

  await usernameField.fill(creds.username)
  await page.locator("#password").fill(creds.password)
  await page.locator("#kc-login").click()
}

/**
 * Navigate to patient-portal and perform full SMART login flow:
 * 1. Go to patient portal
 * 2. Click "Sign In with SMART"
 * 3. Handle Keycloak login
 * 4. Wait for callback redirect and authenticated state
 *
 * Returns the page in authenticated state.
 */
export async function smartLogin(
  page: Page,
  user: keyof typeof testUsers = "patient",
): Promise<void> {
  // Navigate to patient portal
  await page.goto(env.patientPortalURL, { waitUntil: "networkidle" })

  // Check if we're already authenticated (e.g. from stored state)
  const signOutButton = page.getByRole("button", { name: "Sign Out" })
  if (await signOutButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return // Already logged in
  }

  // Click sign in
  const signInButton = page.getByRole("button", { name: "Sign In with SMART" })
  await expect(signInButton).toBeVisible({ timeout: 10_000 })
  await signInButton.click()

  // Handle Keycloak login form
  await keycloakLogin(page, user)

  // Handle Keycloak "Update Account Information" page if it appears
  // (shown for new users missing required profile fields)
  const updateHeading = page.getByRole("heading", { name: "Update Account Information" })
  if (await updateHeading.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const creds = testUsers[user]
    const emailField = page.getByLabel("Email")
    if (await emailField.inputValue() === "") {
      await emailField.fill(`${creds.username}@proxy-smart.test`)
    }
    const firstNameField = page.getByLabel("First name")
    if (await firstNameField.inputValue() === "") {
      await firstNameField.fill("Test")
    }
    const lastNameField = page.getByLabel("Last name")
    if (await lastNameField.inputValue() === "") {
      await lastNameField.fill("User")
    }
    await page.getByRole("button", { name: "Submit" }).click()
  }

  // Wait for redirect back to patient portal in authenticated state
  await expect(signOutButton).toBeVisible({ timeout: 30_000 })
}

/**
 * Perform a full logout from the patient portal.
 */
export async function smartLogout(page: Page): Promise<void> {
  const signOutButton = page.getByRole("button", { name: "Sign Out" })
  await expect(signOutButton).toBeVisible()
  await signOutButton.click()

  // Should return to unauthenticated state
  await expect(
    page.getByRole("button", { name: "Sign In with SMART" }),
  ).toBeVisible({ timeout: 15_000 })
}
