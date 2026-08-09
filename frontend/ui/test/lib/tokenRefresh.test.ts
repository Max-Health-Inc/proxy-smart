// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

import { describe, it, expect, beforeEach, vi } from 'vitest'

const store = new Map<string, unknown>()

vi.mock('@/lib/storage', () => ({
  getItem: vi.fn(async (key: string) => store.get(key) ?? null),
  removeItem: vi.fn(async (key: string) => void store.delete(key)),
}))

import {
  attemptTokenRefresh,
  getValidAccessToken,
  needsRenewal,
  registerRefreshHandler,
  TOKEN_STORAGE_KEY,
} from '@/lib/tokenRefresh'

const secondsFromNow = (seconds: number) => Math.floor(Date.now() / 1000) + seconds

const putTokens = (tokens: Record<string, unknown>) => store.set(TOKEN_STORAGE_KEY, tokens)

describe('needsRenewal', () => {
  beforeEach(() => store.clear())

  it('renews when there is no token at all', () => {
    expect(needsRenewal(null)).toBe(true)
  })

  it('leaves a comfortably valid token alone', () => {
    expect(needsRenewal({ access_token: 'a', expires_at: secondsFromNow(600) })).toBe(false)
  })

  it('renews inside the skew window, before the token actually expires', () => {
    expect(needsRenewal({ access_token: 'a', expires_at: secondsFromNow(5) })).toBe(true)
  })

  it('renews an already expired token', () => {
    expect(needsRenewal({ access_token: 'a', expires_at: secondsFromNow(-60) })).toBe(true)
  })

  it('trusts a token with no recorded expiry', () => {
    expect(needsRenewal({ access_token: 'a' })).toBe(false)
  })
})

describe('getValidAccessToken', () => {
  beforeEach(() => {
    store.clear()
    registerRefreshHandler(async () => {})
  })

  it('returns null when there is no session', async () => {
    await expect(getValidAccessToken()).resolves.toBeNull()
  })

  it('returns the stored token without refreshing when it is still valid', async () => {
    const refresh = vi.fn(async () => {})
    registerRefreshHandler(refresh)
    putTokens({ access_token: 'current', refresh_token: 'r', expires_at: secondsFromNow(600) })

    await expect(getValidAccessToken()).resolves.toBe('current')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('renews first and returns the new token when the stored one is expiring', async () => {
    registerRefreshHandler(async () => {
      putTokens({ access_token: 'renewed', refresh_token: 'r2', expires_at: secondsFromNow(300) })
    })
    putTokens({ access_token: 'stale', refresh_token: 'r', expires_at: secondsFromNow(-1) })

    await expect(getValidAccessToken()).resolves.toBe('renewed')
  })

  it('does not attempt a refresh it cannot make', async () => {
    const refresh = vi.fn(async () => {})
    registerRefreshHandler(refresh)
    putTokens({ access_token: 'stale', expires_at: secondsFromNow(-1) })

    await expect(getValidAccessToken()).resolves.toBe('stale')
    expect(refresh).not.toHaveBeenCalled()
  })
})

describe('attemptTokenRefresh', () => {
  beforeEach(() => {
    store.clear()
    registerRefreshHandler(async () => {})
  })

  it('collapses concurrent callers onto a single refresh', async () => {
    let releaseRefresh!: () => void
    const inFlight = new Promise<void>((resolve) => {
      releaseRefresh = resolve
    })
    const refresh = vi.fn(async () => {
      await inFlight
      putTokens({ access_token: 'renewed', refresh_token: 'r2' })
    })
    registerRefreshHandler(refresh)
    putTokens({ access_token: 'stale', refresh_token: 'r', expires_at: secondsFromNow(-1) })

    const results = Promise.all([
      attemptTokenRefresh(),
      attemptTokenRefresh(),
      attemptTokenRefresh(),
    ])
    releaseRefresh()

    expect(await results).toEqual([true, true, true])
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('starts a fresh attempt once the previous one has settled', async () => {
    const refresh = vi.fn(async () => {
      putTokens({ access_token: 'renewed', refresh_token: 'r2' })
    })
    registerRefreshHandler(refresh)
    putTokens({ access_token: 'stale', refresh_token: 'r', expires_at: secondsFromNow(-1) })

    await attemptTokenRefresh()
    await attemptTokenRefresh()
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('reports failure without a refresh token', async () => {
    putTokens({ access_token: 'stale', expires_at: secondsFromNow(-1) })
    await expect(attemptTokenRefresh()).resolves.toBe(false)
  })

  it('drops the token set when the grant is rejected, so it is not replayed', async () => {
    registerRefreshHandler(async () => {
      throw new Error('invalid_grant: Token is not active')
    })
    putTokens({ access_token: 'stale', refresh_token: 'dead', expires_at: secondsFromNow(-1) })

    await expect(attemptTokenRefresh()).resolves.toBe(false)
    expect(store.has(TOKEN_STORAGE_KEY)).toBe(false)
  })

  it('keeps the token set on a transient failure', async () => {
    registerRefreshHandler(async () => {
      throw new Error('NetworkError: failed to fetch')
    })
    putTokens({ access_token: 'stale', refresh_token: 'r', expires_at: secondsFromNow(-1) })

    await expect(attemptTokenRefresh()).resolves.toBe(false)
    expect(store.has(TOKEN_STORAGE_KEY)).toBe(true)
  })
})
