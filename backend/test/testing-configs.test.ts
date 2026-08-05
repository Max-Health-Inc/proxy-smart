// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * What a compliance stage is allowed to do to the environment it points at.
 *
 * `mode` is the whole contract:
 *
 *   conformance  provisions fixtures (realm client, client scopes, FHIR resources),
 *                logs in as a standing test user whose password is in the config
 *                file, and runs the full Inferno suite. Fine against a disposable
 *                realm holding synthetic data.
 *   enforcement  authenticates, but the password comes from a CI secret and the run
 *                writes nothing. It asserts that consent is actually enforced.
 *
 * The distinction matters because the conformance path deletes and recreates an
 * OAuth client, PUTs a Practitioner and Patient into the target's FHIR store, and
 * needs a permanent human-shaped login to exist. None of that belongs in an
 * environment holding real records, and none of it is visible from the config file
 * alone — which is why it is asserted here rather than left to review.
 */
import { describe, it, expect } from 'bun:test'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const TESTING_DIR = join(import.meta.dir, '..', '..', 'testing')

interface StageConfig {
  test_stage?: string
  target?: string
  mode?: string
  client?: { client_id?: string }
  test_user?: { username?: string; password?: string }
  probe?: { patient_id?: string }
}

const STAGES = readdirSync(TESTING_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => {
    try {
      readFileSync(join(TESTING_DIR, name, 'inferno-config.json'))
      return true
    } catch {
      return false
    }
  })
  .map((name) => ({
    name,
    config: JSON.parse(
      readFileSync(join(TESTING_DIR, name, 'inferno-config.json'), 'utf8'),
    ) as StageConfig,
  }))

describe('compliance stage configs', () => {
  it('finds every stage', () => {
    // Guards the discovery above: a glob that silently matches nothing would make
    // every assertion below vacuous.
    expect(STAGES.length).toBeGreaterThan(0)
  })
})

describe.each(STAGES)('$name', ({ config }) => {
  it('declares a known mode', () => {
    // Substituted rather than asserted non-null so an absent mode reports as
    // "(missing)" instead of failing on a type narrowing detail.
    expect(['conformance', 'enforcement']).toContain(config.mode ?? '(missing)')
  })

  it('names the identity it authenticates as', () => {
    // Both modes authenticate; they differ in where the password comes from.
    expect(config.test_user?.username).toBeTruthy()
    expect(config.client?.client_id).toBeTruthy()
  })
})

const ENFORCEMENT = STAGES.filter((s) => s.config.mode === 'enforcement')

describe.each(ENFORCEMENT)('$name — enforcement mode', ({ config }) => {
  it('carries no password', () => {
    // This repository is public. A deployed environment's password belongs in a CI
    // secret; the workflow reads PROD_TEST_USER_PASSWORD and refuses to run if the
    // config supplies one instead.
    expect(config.test_user?.password).toBeUndefined()
  })

  it('declares the patient the probe requests', () => {
    // Deliberately never created. Consent is evaluated before the request is proxied
    // upstream, so with no Consent resource the only correct answer is 403. If
    // enforcement regressed to audit-only the request would reach the FHIR server and
    // come back 404, which is what makes the assertion meaningful.
    expect(config.probe?.patient_id).toBeTruthy()
  })
})

describe('deployed environments', () => {
  it('runs the conformance suite only where fixtures may be created', () => {
    // The conformance path recreates an OAuth client and writes FHIR resources into
    // the target. Any deployed stage that keeps it is asserting that its realm is
    // disposable and its data synthetic.
    const deployedConformance = STAGES.filter(
      (s) => s.config.target === 'deployed' && s.config.mode === 'conformance',
    ).map((s) => s.name)

    expect(deployedConformance).toEqual(['beta'])
  })
})
