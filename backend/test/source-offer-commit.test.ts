// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * source-offer-commit.test.ts — the AGPL offer names the exact commit, on either version shape.
 *
 * The version has carried the commit as a trailing dot-segment written into every
 * package.json by the release automation. That stamp is what makes develop, test and main
 * rewrite the same lines and conflict, so a build may instead supply the commit itself and
 * leave the tree holding a plain base version. Section 13 does not care which, as long as a
 * network user can still reach the source for the version they are talking to.
 */

import { describe, test, expect } from 'bun:test'
import { commitFromVersion } from '../src/lib/source-offer'

const SHA = '10a843836'

describe('commitFromVersion', () => {
  test('reads the commit a build supplied as SemVer build metadata', () => {
    expect(commitFromVersion(`0.4.6+${SHA}`)).toBe(SHA)
  })

  test('still reads the commit the release automation stamps', () => {
    // Deployments running the old shape must keep answering, so this is not replaced.
    expect(commitFromVersion(`0.2.13-beta.202607241442.${SHA}`)).toBe(SHA)
  })

  test('agrees on the commit whichever way it was carried', () => {
    expect(commitFromVersion(`0.4.6+${SHA}`)).toBe(commitFromVersion(`0.4.6-beta.202608300801.${SHA}`))
  })

  test('answers null rather than guessing when no commit is named', () => {
    // A plain semver build has no commit to offer; buildSourceOffer falls back to the tag.
    expect(commitFromVersion('0.4.6')).toBeNull()
    expect(commitFromVersion('0.4.6-beta.202608300801')).toBeNull()
    expect(commitFromVersion('0.0.1-alpha')).toBeNull()
  })

  test('refuses build metadata that is not a commit', () => {
    expect(commitFromVersion('0.4.6+dirty')).toBeNull()
    expect(commitFromVersion('0.4.6+2026-08-30')).toBeNull()
  })

  test('accepts a full-length sha as well as a short one', () => {
    const full = 'a'.repeat(40)
    expect(commitFromVersion(`0.4.6+${full}`)).toBe(full)
  })
})
