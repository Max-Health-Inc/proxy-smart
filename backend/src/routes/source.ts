// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { Elysia, t } from 'elysia'
import { buildSourceOffer, renderSourceOfferText, type SourceOffer } from '../lib/source-offer'

const SourceOfferResponse = t.Object({
  software: t.String(),
  version: t.String(),
  commit: t.Union([t.String(), t.Null()]),
  license: t.String(),
  repositoryUrl: t.String(),
  sourceUrl: t.String(),
  commercial: t.Object({
    note: t.String(),
    contact: t.String(),
  }),
}, { description: 'AGPL section 13 corresponding-source offer for the deployed version' })

/**
 * AGPL section 13 source offer.
 *
 * proxy-smart is a network service under a copyleft (AGPL) license, so users
 * interacting with it over the network must be able to obtain the corresponding
 * source for the exact version running. These endpoints provide that offer in a
 * machine-readable (JSON) and human/curl-readable (text) form, pinned to the
 * deployed commit. `/.well-known/agpl-source` is the discoverable location.
 */
// Prefer plain text only when the client explicitly asks for it (curl, terminals).
function wantsText(accept: string): boolean {
  return accept.includes('text/plain') && !accept.includes('application/json')
}

/**
 * Negotiate representation. JSON is returned as the typed object (validated
 * against the response schema); a text/plain request returns an explicit
 * Response so it bypasses object-schema coercion.
 */
function negotiateSourceOffer(accept: string): Response | SourceOffer {
  const offer = buildSourceOffer()
  if (wantsText(accept)) {
    return new Response(renderSourceOfferText(offer), {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'public, max-age=300',
      },
    })
  }
  return offer
}

const detail = {
  summary: 'AGPL Source Offer',
  description:
    'Corresponding source offer required by AGPL-3.0 section 13, pinned to the '
    + 'deployed version/commit. Returns JSON, or plain text for Accept: text/plain.',
  tags: ['server'] as string[],
}

export const sourceRoutes = new Elysia({ tags: ['server'] })
  .get('/source', ({ headers, set }) => {
    set.headers['cache-control'] = 'public, max-age=300'
    return negotiateSourceOffer(headers['accept'] ?? '')
  }, { response: { 200: SourceOfferResponse }, detail })
  // Discoverable well-known alias (same payload).
  .get('/.well-known/agpl-source', ({ headers, set }) => {
    set.headers['cache-control'] = 'public, max-age=300'
    return negotiateSourceOffer(headers['accept'] ?? '')
  }, { response: { 200: SourceOfferResponse }, detail: { ...detail, summary: 'AGPL Source Offer (well-known)' } })
