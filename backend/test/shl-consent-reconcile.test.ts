/**
 * SHL→Consent mirror reconciliation bookkeeping in the session store:
 * unmirrored active sessions form the sweep's work list; marking them mirrored
 * removes them; expired sessions are never reconciled.
 */
import { describe, it, expect, beforeAll } from 'bun:test'
import { join } from 'path'
import { tmpdir } from 'os'
import type { ShlSession } from '../src/lib/shl-session-store'

// Point the store at a throwaway DB before importing it (the store opens its DB
// at module load), so this test never touches the real session store.
const dbPath = join(tmpdir(), `shl-reconcile-test-${process.pid}.sqlite`)

let store: typeof import('../src/lib/shl-session-store').shlSessionStore

beforeAll(async () => {
  process.env.SHL_DB_PATH = dbPath
  store = (await import('../src/lib/shl-session-store')).shlSessionStore
})

function mk(id: string, over: Partial<ShlSession> = {}): ShlSession {
  return {
    shl: { url: 'u', key: 'k' },
    jwe: 'jwe',
    sessionToken: `tok-${id}`,
    patientId: 'patient-1',
    fhirServerUrl: 'https://fhir.test/fhir',
    expiresAt: Date.now() + 60 * 60 * 1000,
    verifiedOnly: false,
    accessCount: 0,
    ...over,
  }
}

describe('shlSessionStore consent-mirror reconciliation', () => {
  it('lists unmirrored active sessions and drops them once marked mirrored', () => {
    store.set('rec-1', mk('rec-1'))
    store.set('rec-2', mk('rec-2'))

    let pending = store.listUnmirroredActive().map((p) => p.id)
    expect(pending).toContain('rec-1')
    expect(pending).toContain('rec-2')

    store.markConsentMirrored('rec-1')

    pending = store.listUnmirroredActive().map((p) => p.id)
    expect(pending).not.toContain('rec-1')
    expect(pending).toContain('rec-2')
  })

  it('never reconciles expired sessions', () => {
    store.set('rec-expired', mk('rec-expired', { expiresAt: Date.now() - 1000 }))
    const pending = store.listUnmirroredActive().map((p) => p.id)
    expect(pending).not.toContain('rec-expired')
  })
})
