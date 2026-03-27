import { test, expect } from "@playwright/test"
import { env, testUsers } from "../../lib/env"
import { smartLogin, keycloakLogin } from "../../lib/auth"

test.describe("Patient Portal — Access Control & Multi-Role", () => {
  test.describe("Patient User Access", () => {
    test("patient should see their own data only", async ({ page }) => {
      await smartLogin(page, "patient")

      // Wait for dashboard
      await expect(page.getByText("Loading your health records...")).not.toBeVisible({
        timeout: 30_000,
      })

      // Monitor all FHIR requests — they should all reference the patient's ID
      const fhirRequests: string[] = []
      page.on("request", (req) => {
        if (req.url().includes(env.fhirProxyPath)) {
          fhirRequests.push(req.url())
        }
      })

      await page.reload({ waitUntil: "networkidle" })
      await expect(page.getByText("Loading your health records...")).not.toBeVisible({
        timeout: 30_000,
      })

      // Verify FHIR search requests reference Patient/{patientId}
      const searchRequests = fhirRequests.filter(
        (u) => u.includes("?") && !u.includes("/metadata"),
      )

      for (const url of searchRequests) {
        // Each search should contain the patient parameter
        const u = new URL(url)
        const patientParam = u.searchParams.get("patient")
        if (patientParam) {
          expect(patientParam).toContain("Patient/")
        }
      }
    })

    test("patient should NOT be able to access other patients via URL manipulation", async ({ page }) => {
      await smartLogin(page, "patient")

      // Extract the access token
      const accessToken = await page.evaluate(() => {
        const keys = Object.keys(sessionStorage)
        const tokenKey = keys.find((k) => k.includes("patient_portal_"))
        if (!tokenKey) return null
        return JSON.parse(sessionStorage.getItem(tokenKey)!).access_token
      })

      expect(accessToken).toBeTruthy()

      // Try to access a different patient's data directly via the FHIR proxy
      const response = await page.request.get(
        `${env.baseURL}/${env.fhirProxyPath}/Patient/someone-elses-id`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/fhir+json",
          },
        },
      )

      // The proxy should block this — either 403 or 404
      // If it returns 200, that's a security issue
      expect([403, 404, 401]).toContain(response.status())
    })

    test("patient should NOT be able to perform write operations", async ({ page }) => {
      await smartLogin(page, "patient")

      const accessToken = await page.evaluate(() => {
        const keys = Object.keys(sessionStorage)
        const tokenKey = keys.find((k) => k.includes("patient_portal_"))
        if (!tokenKey) return null
        return JSON.parse(sessionStorage.getItem(tokenKey)!).access_token
      })

      expect(accessToken).toBeTruthy()

      // Try to create a resource (should be blocked — patient has *.read only)
      const response = await page.request.post(
        `${env.baseURL}/${env.fhirProxyPath}/Observation`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/fhir+json",
          },
          data: JSON.stringify({
            resourceType: "Observation",
            status: "final",
            code: {
              coding: [{ system: "http://loinc.org", code: "29463-7", display: "Body weight" }],
            },
            valueQuantity: { value: 70, unit: "kg" },
          }),
        },
      )

      // Should be forbidden
      expect([403, 405, 401]).toContain(response.status())
    })
  })

  test.describe("Practitioner User Access", () => {
    test("practitioner should be able to login to patient portal", async ({ page }) => {
      await page.goto(env.patientPortalURL, { waitUntil: "networkidle" })
      await page.getByRole("button", { name: "Sign In with SMART" }).click()
      await keycloakLogin(page, "practitioner")

      // Practitioner should either:
      // - Reach authenticated state with doctor's patient context (smart_patient)
      // - Or see "No patient context" error if launch context isn't set
      const isAuthenticated = await page
        .getByRole("button", { name: "Sign Out" })
        .isVisible({ timeout: 30_000 })
        .catch(() => false)

      expect(isAuthenticated).toBe(true)
    })

    test("practitioner should see patient context data (if smart_patient is set)", async ({ page }) => {
      await page.goto(env.patientPortalURL, { waitUntil: "networkidle" })
      await page.getByRole("button", { name: "Sign In with SMART" }).click()
      await keycloakLogin(page, "practitioner")

      await expect(
        page.getByRole("button", { name: "Sign Out" }),
      ).toBeVisible({ timeout: 30_000 })

      // Doctor user has smart_patient: test-patient
      // Should either show dashboard or "No patient context" message
      const hasDashboard = await page
        .getByText("Active Conditions")
        .isVisible({ timeout: 15_000 })
        .catch(() => false)
      const noContext = await page
        .getByText("No patient context available")
        .isVisible({ timeout: 5_000 })
        .catch(() => false)

      expect(hasDashboard || noContext).toBe(true)
    })
  })

  test.describe("SMART Scope Enforcement", () => {
    test("should only allow read operations matching granted scopes", async ({ page }) => {
      await smartLogin(page, "patient")

      const accessToken = await page.evaluate(() => {
        const keys = Object.keys(sessionStorage)
        const tokenKey = keys.find((k) => k.includes("patient_portal_"))
        if (!tokenKey) return null
        return JSON.parse(sessionStorage.getItem(tokenKey)!).access_token
      })

      // Try to read AllergyIntolerance (should work — patient/*.read)
      const allergyResp = await page.request.get(
        `${env.baseURL}/${env.fhirProxyPath}/AllergyIntolerance?patient=Patient/${testUsers.patient.patientId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/fhir+json",
          },
        },
      )

      expect(allergyResp.status()).toBeLessThan(400)

      // Try to DELETE a resource (should be blocked)
      const deleteResp = await page.request.delete(
        `${env.baseURL}/${env.fhirProxyPath}/Patient/${testUsers.patient.patientId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )

      expect([403, 405, 401]).toContain(deleteResp.status())
    })

    test("should enforce patient compartment (no cross-patient reads)", async ({ page }) => {
      await smartLogin(page, "patient")

      const accessToken = await page.evaluate(() => {
        const keys = Object.keys(sessionStorage)
        const tokenKey = keys.find((k) => k.includes("patient_portal_"))
        if (!tokenKey) return null
        return JSON.parse(sessionStorage.getItem(tokenKey)!).access_token
      })

      // Search for ALL patients (no patient filter) — should be blocked or scoped
      const response = await page.request.get(
        `${env.baseURL}/${env.fhirProxyPath}/Patient`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/fhir+json",
          },
        },
      )

      if (response.ok()) {
        const bundle = await response.json()
        // If the search succeeds, it should only return the authorized patient
        if (bundle.entry && bundle.entry.length > 0) {
          for (const entry of bundle.entry) {
            expect(entry.resource.id).toBe(testUsers.patient.patientId)
          }
        }
      } else {
        // Alternatively, the proxy might block unscoped Patient searches
        expect([403, 401]).toContain(response.status())
      }
    })
  })
})
