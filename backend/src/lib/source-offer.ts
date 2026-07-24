// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { config } from '../config'

/**
 * AGPL section 13 "corresponding source" offer.
 *
 * The AGPL requires that network users of a deployed version can obtain the
 * exact source it was built from. Release versions embed the git commit as the
 * final dot-segment (e.g. `0.2.13-beta.202607241442.ef7430c8b`), so we can pin
 * the offer to that commit; for a plain semver build we fall back to the
 * matching release tag, and otherwise to the repository root.
 */
export interface SourceOffer {
  software: string
  version: string
  /** Resolved git commit SHA when derivable from the version string, else null. */
  commit: string | null
  /** SPDX license expression for this software. */
  license: string
  repositoryUrl: string
  /** Link to the corresponding source for the deployed version specifically. */
  sourceUrl: string
  commercial: {
    note: string
    contact: string
  }
}

/** Extract the trailing git SHA embedded by the release automation, if present. */
export function commitFromVersion(version: string): string | null {
  const last = version.split('.').pop() ?? ''
  return /^[0-9a-f]{7,40}$/i.test(last) ? last : null
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

export function buildSourceOffer(): SourceOffer {
  const version = config.version
  const repositoryUrl = stripTrailingSlash(config.source.repositoryUrl)
  const commit = commitFromVersion(version)

  // Prefer the exact commit; otherwise the release tag (`v<version>`); the
  // repo root is only used when no version identity is available at all.
  const sourceUrl = commit
    ? `${repositoryUrl}/tree/${commit}`
    : version && version !== '0.0.1-alpha'
      ? `${repositoryUrl}/releases/tag/v${version}`
      : repositoryUrl

  return {
    software: config.displayName,
    version,
    commit,
    license: config.source.license,
    repositoryUrl,
    sourceUrl,
    commercial: {
      note:
        'This software is dual-licensed. Network use is governed by AGPL-3.0-or-later '
        + 'unless a separate commercial license has been obtained.',
      contact: config.source.commercialContact,
    },
  }
}

/** Plain-text rendering for `Accept: text/plain` clients and curl. */
export function renderSourceOfferText(offer: SourceOffer): string {
  return [
    `${offer.software} ${offer.version}`,
    `License: ${offer.license}`,
    `Corresponding source (AGPL section 13): ${offer.sourceUrl}`,
    `Repository: ${offer.repositoryUrl}`,
    offer.commit ? `Commit: ${offer.commit}` : null,
    '',
    offer.commercial.note,
    `Commercial licensing: ${offer.commercial.contact}`,
    '',
  ].filter(v => v !== null).join('\n')
}
