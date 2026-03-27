import { test, expect } from "@playwright/test"
import { env, testUsers } from "../../lib/env"
import { smartLogin } from "../../lib/auth"

const TOKEN_KEY = "patient_portal_token"

/** Extract access_token from sessionStorage after smartLogin */
async function getAccessToken(page: import("@playwright/test").Page): Promise<string> {
  const token = await page.evaluate((key) => {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw).access_token ?? null
  }, TOKEN_KEY)
  if (!token) throw new Error("No access_token found in sessionStorage")
  return token
}

test.describe("Patient Portal — IPS & Advanced FHIR Operations", () => {
  test.describe("International Patient Summary ($summary)", () => {
    test("should be able to fetch IPS $summary for the patient", async ({ page }) => {
      await smartLogin(page, "patient")

      const accessToken = await getAccessToken(page)

      // Call $summary operation
      const response = await page.request.get(
        `${env.baseURL}/${env.fhirProxyPath}/Patient/${testUsers.patient.patientId}/$summary`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/fhir+json",
          },
        },
      )

      // $summary should either work (200) or not be supported (404/422)
      if (response.ok()) {
        const bundle = await response.json()
        expect(bundle.resourceType).toBe("Bundle")
        expect(bundle.type).toBe("document")

        // IPS bundle should have a Composition as the first entry
        const firstEntry = bundle.entry?.[0]?.resource
        expect(firstEntry?.resourceType).toBe("Composition")
      } else {
        // If not supported, it should indicate it properly
        expect([404, 422, 501]).toContain(response.status())
      }
    })
  })

  test.describe("FHIR Search Parameters", () => {
    test("should support _count parameter to limit results", async ({ page }) => {
      await smartLogin(page, "patient")

      const accessToken = await getAccessToken(page)

      const response = await page.request.get(
        `${env.baseURL}/${env.fhirProxyPath}/Observation?patient=Patient/${testUsers.patient.patientId}&category=vital-signs&_count=2`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/fhir+json",
          },
        },
      )

      if (response.ok()) {
        const bundle = await response.json()
        expect(bundle.resourceType).toBe("Bundle")
        // Should respect _count limit
        if (bundle.entry) {
          expect(bundle.entry.length).toBeLessThanOrEqual(2)
        }
      }
    })

    test("should support _sort parameter for ordering results", async ({ page }) => {
      await smartLogin(page, "patient")

      const accessToken = await getAccessToken(page)

      const response = await page.request.get(
        `${env.baseURL}/${env.fhirProxyPath}/Observation?patient=Patient/${testUsers.patient.patientId}&category=vital-signs&_sort=-date`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/fhir+json",
          },
        },
      )

      expect(response.ok()).toBe(true)
      const bundle = await response.json()
      expect(bundle.resourceType).toBe("Bundle")
    })

    test("should support clinical-status search parameter for conditions", async ({ page }) => {
      await smartLogin(page, "patient")

      const accessToken = await getAccessToken(page)

      const response = await page.request.get(
        `${env.baseURL}/${env.fhirProxyPath}/Condition?patient=Patient/${testUsers.patient.patientId}&clinical-status=active`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/fhir+json",
          },
        },
      )

      expect(response.ok()).toBe(true)
      const bundle = await response.json()
      expect(bundle.resourceType).toBe("Bundle")
    })
  })

  test.describe("FHIR Resource Type Coverage", () => {
    const resourceTypes = [
      "Condition",
      "AllergyIntolerance",
      "MedicationStatement",
      "Immunization",
      "Observation",
      "DiagnosticReport",
      "DocumentReference",
    ]

    for (const resourceType of resourceTypes) {
      test(`should be able to search ${resourceType} for patient`, async ({ page }) => {
        await smartLogin(page, "patient")

        const accessToken = await getAccessToken(page)

        const response = await page.request.get(
          `${env.baseURL}/${env.fhirProxyPath}/${resourceType}?patient=Patient/${testUsers.patient.patientId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/fhir+json",
            },
          },
        )

        // Should be able to search (even if no data exists)
        expect(response.status()).toBeLessThan(500)
        if (response.ok()) {
          const bundle = await response.json()
          expect(bundle.resourceType).toBe("Bundle")
        }
      })
    }

    test("should be able to read Patient resource by ID", async ({ page }) => {
      await smartLogin(page, "patient")

      const accessToken = await getAccessToken(page)

      const response = await page.request.get(
        `${env.baseURL}/${env.fhirProxyPath}/Patient/${testUsers.patient.patientId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/fhir+json",
          },
        },
      )

      // Should return the patient resource
      expect(response.ok()).toBe(true)
      const patient = await response.json()
      expect(patient.resourceType).toBe("Patient")
      expect(patient.id).toBe(testUsers.patient.patientId)
    })
  })

  test.describe("FHIR Content Negotiation", () => {
    test("should return JSON when Accept: application/fhir+json", async ({ page }) => {
      await smartLogin(page, "patient")

      const accessToken = await getAccessToken(page)

      const response = await page.request.get(
        `${env.baseURL}/${env.fhirProxyPath}/Patient/${testUsers.patient.patientId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/fhir+json",
          },
        },
      )

      expect(response.ok()).toBe(true)
      const contentType = response.headers()["content-type"]
      expect(contentType).toContain("json")
    })

    test("should handle Accept: application/fhir+xml (or reject cleanly)", async ({ page }) => {
      await smartLogin(page, "patient")

      const accessToken = await getAccessToken(page)

      const response = await page.request.get(
        `${env.baseURL}/${env.fhirProxyPath}/Patient/${testUsers.patient.patientId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/fhir+xml",
          },
        },
      )

      // Should either return XML (200) or indicate unsupported (406)
      expect([200, 406]).toContain(response.status())
    })
  })

  test.describe("FHIR Pagination", () => {
    test("should include pagination links in Bundle response", async ({ page }) => {
      await smartLogin(page, "patient")

      const accessToken = await getAccessToken(page)

      const response = await page.request.get(
        `${env.baseURL}/${env.fhirProxyPath}/Observation?patient=Patient/${testUsers.patient.patientId}&_count=1`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/fhir+json",
          },
        },
      )

      if (response.ok()) {
        const bundle = await response.json()

        // If there are results, check for pagination
        if (bundle.total > 1) {
          const nextLink = bundle.link?.find((l: { relation: string }) => l.relation === "next")
          expect(nextLink).toBeTruthy()
        }
      }
    })
  })
})
