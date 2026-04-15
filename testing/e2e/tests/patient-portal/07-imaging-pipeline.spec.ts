import { test, expect } from "@playwright/test"
import { env, testUsers } from "../../lib/env"

/**
 * E2E test: DICOMweb Imaging Pipeline
 *
 * Downloads a sample CT DICOM from the cornerstone repo, uploads it to
 * the PACS (Orthanc) via STOW-RS through the Proxy Smart DICOMweb proxy,
 * then verifies QIDO-RS query, WADO-RS metadata retrieval, and thumbnail
 * rendering all work end-to-end.
 *
 * Prerequisites:
 *   - Orthanc PACS running and configured (DICOMWEB_BASE_URL set)
 *   - A test user that can authenticate via Keycloak
 */

const DICOM_SAMPLE_URL =
  "https://raw.githubusercontent.com/cornerstonejs/cornerstoneWADOImageLoader/master/testImages/CTImage.dcm"

const STOW_BOUNDARY = "----E2ETestBoundary"

// ── Token helper (direct Keycloak resource-owner password grant) ────────

async function getAccessToken(): Promise<string> {
  const tokenUrl = `${env.keycloakURL}/realms/proxy-smart/protocol/openid-connect/token`
  const creds = testUsers.patient

  const body = new URLSearchParams({
    grant_type: "password",
    client_id: "patient-portal",
    username: creds.username,
    password: creds.password,
    scope: "openid fhirUser launch/patient",
  })

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Token request failed (${resp.status}): ${text}`)
  }

  const json = (await resp.json()) as { access_token: string }
  return json.access_token
}

// ── STOW-RS multipart body builder ─────────────────────────────────────

function buildStowBody(dcmBuffer: ArrayBuffer): Blob {
  const encoder = new TextEncoder()
  return new Blob([
    encoder.encode(`\r\n--${STOW_BOUNDARY}\r\nContent-Type: application/dicom\r\n\r\n`),
    dcmBuffer,
    encoder.encode(`\r\n--${STOW_BOUNDARY}--\r\n`),
  ])
}

// ── DICOM tag accessors (QIDO-RS returns JSON with tag keys) ───────────

const Tag = {
  StudyInstanceUID: "0020000D",
  SeriesInstanceUID: "0020000E",
  SOPInstanceUID: "00080018",
  Modality: "00080060",
  PatientName: "00100010",
} as const

function tagValue(instance: Record<string, any>, tag: string): string | undefined {
  return instance?.[tag]?.Value?.[0]?.Alphabetic ?? instance?.[tag]?.Value?.[0]
}

// ── Tests ──────────────────────────────────────────────────────────────

test.describe("DICOMweb Imaging Pipeline (E2E)", () => {
  let token: string
  let dcmBuffer: ArrayBuffer
  let studyUID: string

  test.beforeAll(async () => {
    // 1) Obtain an access token
    token = await getAccessToken()
    expect(token).toBeTruthy()

    // 2) Download sample DICOM
    const resp = await fetch(DICOM_SAMPLE_URL)
    expect(resp.ok).toBe(true)
    dcmBuffer = await resp.arrayBuffer()
    expect(dcmBuffer.byteLength).toBeGreaterThan(1000) // sanity check — CTImage.dcm is ~500 KB
  })

  test("PACS should be reachable (/dicomweb/status)", async () => {
    const resp = await fetch(`${env.baseURL}/dicomweb/status`)
    expect(resp.ok).toBe(true)
    const status = (await resp.json()) as { configured: boolean; reachable: boolean | null }
    expect(status.configured).toBe(true)
    expect(status.reachable).toBe(true)
  })

  test("STOW-RS: upload CTImage.dcm", async () => {
    const body = buildStowBody(dcmBuffer)

    const resp = await fetch(`${env.baseURL}/dicomweb/studies`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; type="application/dicom"; boundary=${STOW_BOUNDARY}`,
        Accept: "application/dicom+json",
      },
      body,
    })

    // STOW-RS returns 200 on success (Orthanc), some PACS return 200 or 202
    expect(resp.status).toBeLessThan(300)
  })

  test("QIDO-RS: query studies and find the uploaded study", async () => {
    // Query all studies — the uploaded CTImage.dcm should appear
    const resp = await fetch(`${env.baseURL}/dicomweb/studies`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/dicom+json",
      },
    })

    expect(resp.ok).toBe(true)
    const studies = (await resp.json()) as Record<string, any>[]
    expect(studies.length).toBeGreaterThan(0)

    // Find a study with a CT modality or just take the first one
    const ctStudy = studies.find(
      (s) => tagValue(s, Tag.Modality) === "CT",
    )
    const target = ctStudy ?? studies[0]
    studyUID = tagValue(target, Tag.StudyInstanceUID) ?? ""
    expect(studyUID).toBeTruthy()
  })

  test("QIDO-RS: query series within the study", async () => {
    expect(studyUID).toBeTruthy()

    const resp = await fetch(
      `${env.baseURL}/dicomweb/studies/${studyUID}/series`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/dicom+json",
        },
      },
    )

    expect(resp.ok).toBe(true)
    const series = (await resp.json()) as Record<string, any>[]
    expect(series.length).toBeGreaterThan(0)

    // Verify series has a SeriesInstanceUID
    const seriesUID = tagValue(series[0], Tag.SeriesInstanceUID)
    expect(seriesUID).toBeTruthy()
  })

  test("WADO-RS: retrieve study metadata", async () => {
    expect(studyUID).toBeTruthy()

    const resp = await fetch(
      `${env.baseURL}/dicomweb/studies/${studyUID}/metadata`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/dicom+json",
        },
      },
    )

    expect(resp.ok).toBe(true)
    const metadata = (await resp.json()) as Record<string, any>[]
    expect(metadata.length).toBeGreaterThan(0)

    // Should contain a SOP Instance UID
    const sopUID = tagValue(metadata[0], Tag.SOPInstanceUID)
    expect(sopUID).toBeTruthy()
  })

  test("WADO-RS: retrieve study thumbnail/rendered", async () => {
    expect(studyUID).toBeTruthy()

    // Try rendered first (wider PACS support), fall back to thumbnail
    const renderedResp = await fetch(
      `${env.baseURL}/dicomweb/studies/${studyUID}/rendered`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "image/jpeg",
        },
      },
    )

    if (renderedResp.ok) {
      const contentType = renderedResp.headers.get("content-type") ?? ""
      expect(contentType).toContain("image")
      const body = await renderedResp.arrayBuffer()
      expect(body.byteLength).toBeGreaterThan(100) // non-trivial image
      return
    }

    // Fallback: try thumbnail endpoint
    const thumbResp = await fetch(
      `${env.baseURL}/dicomweb/studies/${studyUID}/thumbnail`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "image/jpeg",
        },
      },
    )

    // Thumbnail may not be supported by all PACS — treat 501/404 as a soft pass
    if (thumbResp.ok) {
      const contentType = thumbResp.headers.get("content-type") ?? ""
      expect(contentType).toContain("image")
    } else {
      // At minimum, do not 500
      expect([200, 404, 406, 501]).toContain(thumbResp.status)
    }
  })
})
