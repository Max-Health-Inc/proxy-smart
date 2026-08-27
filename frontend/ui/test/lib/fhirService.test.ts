// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Covers the two things the hand-rolled Person service got wrong, so moving it
 * onto @babelfhir-ts/client-r4 cannot silently regress them:
 *
 *  - a search read `bundle.entry` off the first response only, so every result
 *    past page one was dropped without a trace;
 *  - a link's target type came from asserting the reference's first segment to
 *    Patient | Practitioner | RelatedPerson, defaulting a missing one to
 *    Patient — so a link to anything else was displayed as a link to a patient.
 *
 * Plus the proxy path segment, which is the only thing the FHIR version decides.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('@/lib/apiClient', () => ({
  getStoredToken: vi.fn(async () => 'admin-token'),
}))

vi.mock('@/config', () => ({
  config: { api: { baseUrl: 'https://api.example.com' } },
}))

import {
  createPersonResource,
  getPersonResourceFull,
  searchPersonResources,
} from '@/service/fhirService'
import type { ServerInfo } from '@/lib/person-linking'

const SERVER: ServerInfo = {
  serverName: 'Test',
  version: '1.0',
  baseUrl: 'https://fhir.example.com',
  fhirVersion: '4.0.1',
}

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/fhir+json' },
  })

type FetchCalls = { mock: { calls: Parameters<typeof globalThis.fetch>[] } }

const requestedUrls = (spy: FetchCalls): string[] =>
  spy.mock.calls.map(([input]) => String(input))

describe('searchPersonResources', () => {
  afterEach(() => vi.restoreAllMocks())

  it('follows pagination so results past the first page are not dropped', async () => {
    const page1 = {
      resourceType: 'Bundle',
      link: [
        {
          relation: 'next',
          url: 'https://api.example.com/proxy/srv/R4/Person?page=2',
        },
      ],
      entry: [{ resource: { resourceType: 'Person', id: 'p1', name: [{ family: 'One' }] } }],
    }
    const page2 = {
      resourceType: 'Bundle',
      entry: [{ resource: { resourceType: 'Person', id: 'p2', name: [{ family: 'Two' }] } }],
    }

    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(page1))
      .mockResolvedValueOnce(jsonResponse(page2))

    const results = await searchPersonResources('srv', '4.0.1', { name: 'o' })

    expect(results.map((r) => r.id)).toEqual(['Person/p1', 'Person/p2'])
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('maps an email search onto the telecom parameter', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => jsonResponse({ resourceType: 'Bundle', entry: [] }))

    await searchPersonResources('srv', '4.0.1', { email: 'a@b.example' })

    expect(requestedUrls(spy)[0]).toContain('telecom=email%7Ca%40b.example')
  })

  it('sends the request through the proxy path for the server FHIR release', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => jsonResponse({ resourceType: 'Bundle', entry: [] }))

    await searchPersonResources('srv', '3.0.2', {})
    await searchPersonResources('srv', '5.0.0', {})
    await searchPersonResources('srv', 'something-unrecognised', {})

    const urls = requestedUrls(spy)
    expect(urls[0]).toContain('/proxy/srv/R3/Person')
    expect(urls[1]).toContain('/proxy/srv/R5/Person')
    expect(urls[2]).toContain('/proxy/srv/R4/Person')
  })
})

describe('getPersonResourceFull', () => {
  afterEach(() => vi.restoreAllMocks())

  it('drops a link whose target is not a linkable resource type', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        resourceType: 'Person',
        id: 'p1',
        name: [{ family: 'Doe', given: ['Jane'] }],
        link: [
          { target: { reference: 'Patient/1' }, assurance: 'level3' },
          { target: { reference: 'Organization/9' }, assurance: 'level2' },
          { target: { display: 'no reference at all' } },
        ],
      }),
    )

    const person = await getPersonResourceFull('srv', '4.0.1', 'Person/p1', SERVER)

    expect(person.links).toHaveLength(1)
    expect(person.links[0].target).toMatchObject({
      resourceType: 'Patient',
      reference: 'Patient/1',
    })
    expect(person.links[0].assurance).toBe('level3')
  })

  it('falls back to level1 for an assurance code FHIR does not define', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        resourceType: 'Person',
        id: 'p1',
        link: [{ target: { reference: 'Practitioner/7' }, assurance: 'level9' }],
      }),
    )

    const person = await getPersonResourceFull('srv', '4.0.1', 'p1', SERVER)

    expect(person.links[0].assurance).toBe('level1')
  })
})

describe('createPersonResource', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it('posts the Person with the admin bearer token', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        jsonResponse({ resourceType: 'Person', id: 'new-1', name: [{ text: 'Jane Doe' }] }),
      )

    const created = await createPersonResource('srv', '4.0.1', {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
    })

    expect(created).toEqual({ id: 'Person/new-1', display: 'Jane Doe' })

    const [url, init] = spy.mock.calls[0]
    expect(String(url)).toBe('https://api.example.com/proxy/srv/R4/Person')
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer admin-token')

    const sent = JSON.parse(String(init?.body)) as { telecom?: { value?: string }[] }
    expect(sent.telecom?.[0]?.value).toBe('jane@example.com')
  })
})
