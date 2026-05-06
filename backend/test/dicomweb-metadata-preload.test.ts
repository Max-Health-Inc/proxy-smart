import { describe, it, expect, beforeEach, afterEach } from 'bun:test'

/**
 * TDD tests for WADO-RS metadata preloading.
 *
 * Root cause: Cornerstone's wadors metadata provider only works if metadata
 * was first inserted into its internal metaDataManager via .add(imageId, metadata).
 * Neither the patient-portal nor the smart-dicom-template fetches WADO-RS metadata
 * before loading images, so imagePixelModule is undefined → samplesPerPixel crash.
 *
 * These tests verify the pure logic that:
 * 1. Fetches WADO-RS series metadata from the proxy
 * 2. Maps each instance to a Cornerstone imageId
 * 3. Returns entries suitable for metaDataManager.add()
 */

// ── Test fixtures: realistic DICOM JSON metadata ──────────────────────────

const STUDY_UID = '1.2.840.113619.2.30.1.1762295590.1623.978668949.886'
const SERIES_UID = '1.2.840.113619.2.30.1.1762295590.1623.978668949.890'
const SOP_UID_1 = '1.2.840.113619.2.30.1.1762295590.1623.978668950.109'
const SOP_UID_2 = '1.2.840.113619.2.30.1.1762295590.1623.978668950.110'
const BASE_URL = 'https://beta.proxy-smart.com/dicomweb'

/** Minimal DICOM JSON instance with imagePixelModule tags */
function makeDicomJsonInstance(sopUID: string) {
  return {
    // SOP Instance UID
    '00080018': { Value: [sopUID], vr: 'UI' },
    // SOP Class UID (CT Image Storage)
    '00080016': { Value: ['1.2.840.10008.5.1.4.1.1.2'], vr: 'UI' },
    // Modality
    '00080060': { Value: ['CT'], vr: 'CS' },
    // Samples Per Pixel
    '00280002': { Value: [1], vr: 'US' },
    // Photometric Interpretation
    '00280004': { Value: ['MONOCHROME2'], vr: 'CS' },
    // Rows
    '00280010': { Value: [512], vr: 'US' },
    // Columns
    '00280011': { Value: [512], vr: 'US' },
    // Bits Allocated
    '00280100': { Value: [16], vr: 'US' },
    // Bits Stored
    '00280101': { Value: [12], vr: 'US' },
    // High Bit
    '00280102': { Value: [11], vr: 'US' },
    // Pixel Representation
    '00280103': { Value: [0], vr: 'US' },
    // Number of Frames
    '00280008': { Value: ['1'], vr: 'IS' },
  }
}

const METADATA_RESPONSE = [
  makeDicomJsonInstance(SOP_UID_1),
  makeDicomJsonInstance(SOP_UID_2),
]

// ── Mock fetch ────────────────────────────────────────────────────────────

const ORIGINAL_FETCH = globalThis.fetch

function mockFetchWith(body: unknown, init?: ResponseInit) {
  const calls: Array<{ url: string; opts?: RequestInit }> = []
  const mockFn = Object.assign(
    async (url: string | URL | Request, opts?: RequestInit) => {
      calls.push({ url: url.toString(), opts })
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/dicom+json' },
        ...init,
      })
    },
    { preconnect: () => {} },
  ) as typeof fetch
  globalThis.fetch = mockFn
  return { mockFn, calls }
}

// ── Import the function under test ────────────────────────────────────────
// This is a pure function: (baseUrl, studyUID, seriesUID, headers?) → entries[]
// It lives in a shared module both apps can use.

import {
  fetchSeriesMetadataEntries,
} from '../src/lib/dicomweb-metadata'

describe('fetchSeriesMetadataEntries', () => {
  beforeEach(() => {
    globalThis.fetch = ORIGINAL_FETCH
  })

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH
  })

  it('fetches WADO-RS series metadata and returns imageId→metadata entries', async () => {
    const { calls } = mockFetchWith(METADATA_RESPONSE)

    const entries = await fetchSeriesMetadataEntries(BASE_URL, STUDY_UID, SERIES_UID)

    // Should have made exactly one fetch call to the series metadata endpoint
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(
      `${BASE_URL}/studies/${STUDY_UID}/series/${SERIES_UID}/metadata`,
    )

    // Should return one entry per instance
    expect(entries).toHaveLength(2)

    // Each entry should have an imageId and the full DICOM JSON metadata
    const entry1 = entries.find((e) => e.imageId.includes(SOP_UID_1))!
    expect(entry1).toBeDefined()
    expect(entry1.imageId).toBe(
      `wadors:${BASE_URL}/studies/${STUDY_UID}/series/${SERIES_UID}/instances/${SOP_UID_1}/frames/1`,
    )
    expect(entry1.metadata['00280002']).toEqual({ Value: [1], vr: 'US' }) // samplesPerPixel
    expect(entry1.metadata['00280010']).toEqual({ Value: [512], vr: 'US' }) // rows
  })

  it('passes auth headers to the metadata fetch', async () => {
    const { calls } = mockFetchWith(METADATA_RESPONSE)
    const headers = { Authorization: 'Bearer test-token-123' }

    await fetchSeriesMetadataEntries(BASE_URL, STUDY_UID, SERIES_UID, headers)

    expect(calls[0].opts?.headers).toEqual(headers)
  })

  it('returns empty array when metadata fetch fails', async () => {
    mockFetchWith('Not Found', { status: 404 })

    const entries = await fetchSeriesMetadataEntries(BASE_URL, STUDY_UID, SERIES_UID)

    expect(entries).toEqual([])
  })

  it('returns empty array when metadata fetch throws (network error)', async () => {
    globalThis.fetch = Object.assign(
      async () => { throw new Error('ECONNREFUSED') },
      { preconnect: () => {} },
    ) as typeof fetch

    const entries = await fetchSeriesMetadataEntries(BASE_URL, STUDY_UID, SERIES_UID)

    expect(entries).toEqual([])
  })

  it('skips instances without a SOP Instance UID', async () => {
    const metadataWithMissingSop = [
      makeDicomJsonInstance(SOP_UID_1),
      { '00080060': { Value: ['CT'], vr: 'CS' } }, // no 00080018
    ]
    mockFetchWith(metadataWithMissingSop)

    const entries = await fetchSeriesMetadataEntries(BASE_URL, STUDY_UID, SERIES_UID)

    expect(entries).toHaveLength(1)
    expect(entries[0].imageId).toContain(SOP_UID_1)
  })

  it('handles multi-frame instances by using frame 1', async () => {
    const multiFrameInstance = {
      ...makeDicomJsonInstance(SOP_UID_1),
      '00280008': { Value: ['10'], vr: 'IS' }, // 10 frames
    }
    mockFetchWith([multiFrameInstance])

    const entries = await fetchSeriesMetadataEntries(BASE_URL, STUDY_UID, SERIES_UID)

    expect(entries).toHaveLength(1)
    expect(entries[0].imageId).toContain('/frames/1')
  })

  it('strips trailing slashes from base URL', async () => {
    const { calls } = mockFetchWith(METADATA_RESPONSE)

    await fetchSeriesMetadataEntries(`${BASE_URL}/`, STUDY_UID, SERIES_UID)

    expect(calls[0].url).toBe(
      `${BASE_URL}/studies/${STUDY_UID}/series/${SERIES_UID}/metadata`,
    )
  })
})
