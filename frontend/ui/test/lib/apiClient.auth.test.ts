// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Covers the two ways the admin UI used to surface a 401 the user could not act on:
 * a client built before the session was restored (no Authorization header at all),
 * and a client still holding the pre-refresh token after a rotation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const store = new Map<string, unknown>()

vi.mock('@/lib/storage', () => ({
  getItem: vi.fn(async (key: string) => store.get(key) ?? null),
  removeItem: vi.fn(async (key: string) => void store.delete(key)),
}))

import { clientApis, setAuthErrorHandler, getStoredToken } from '@/lib/apiClient'
import { registerRefreshHandler, TOKEN_STORAGE_KEY } from '@/lib/tokenRefresh'

const secondsFromNow = (seconds: number) => Math.floor(Date.now() / 1000) + seconds

const putTokens = (tokens: Record<string, unknown>) => store.set(TOKEN_STORAGE_KEY, tokens)

const authHeaderOf = (call: unknown[] | undefined): string | undefined => {
  const init = call?.[1] as RequestInit | undefined
  const headers = init?.headers as Record<string, string> | undefined
  return headers?.Authorization
}

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

describe('clientApis auth behaviour', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    store.clear()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    registerRefreshHandler(async () => {})
    // Re-arms the logout latch between tests.
    setAuthErrorHandler(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends the token stored at request time, not at construction time', async () => {
    // `clientApis` is built at module load, before any session exists — exactly the
    // state the store rehydrates into.
    putTokens({ access_token: 'restored', refresh_token: 'r', expires_at: secondsFromNow(600) })
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 'u1', username: 'admin' }))

    await clientApis.admin.getAdminProfile()

    expect(authHeaderOf(fetchMock.mock.calls[0])).toBe('Bearer restored')
  })

  it('sends no Authorization header when there is no session', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 'u1', username: 'admin' }))

    await clientApis.admin.getAdminProfile()

    expect(authHeaderOf(fetchMock.mock.calls[0])).toBeUndefined()
  })

  it('refreshes and replays the request once on a 401', async () => {
    putTokens({ access_token: 'expired', refresh_token: 'r', expires_at: secondsFromNow(600) })
    registerRefreshHandler(async () => {
      putTokens({ access_token: 'renewed', refresh_token: 'r2', expires_at: secondsFromNow(600) })
    })

    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { error: 'Unauthorized' }))
      .mockResolvedValueOnce(jsonResponse(200, { id: 'u1', username: 'admin' }))

    const profile = await clientApis.admin.getAdminProfile()

    expect(profile.username).toBe('admin')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(authHeaderOf(fetchMock.mock.calls[0])).toBe('Bearer expired')
    expect(authHeaderOf(fetchMock.mock.calls[1])).toBe('Bearer renewed')
  })

  it('logs out and surfaces the error when the refresh cannot recover', async () => {
    putTokens({ access_token: 'expired', refresh_token: 'dead', expires_at: secondsFromNow(600) })
    registerRefreshHandler(async () => {
      throw new Error('invalid_grant')
    })
    const onAuthError = vi.fn()
    setAuthErrorHandler(onAuthError)

    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'Unauthorized' }))

    await expect(clientApis.admin.getAdminProfile()).rejects.toBeDefined()
    expect(onAuthError).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not retry or log out on a non-auth failure', async () => {
    putTokens({ access_token: 'good', refresh_token: 'r', expires_at: secondsFromNow(600) })
    const onAuthError = vi.fn()
    setAuthErrorHandler(onAuthError)

    fetchMock.mockResolvedValue(jsonResponse(500, { error: 'Internal Server Error' }))

    await expect(clientApis.admin.getAdminProfile()).rejects.toBeDefined()
    expect(onAuthError).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('hands raw fetch callers the same renewed token', async () => {
    registerRefreshHandler(async () => {
      putTokens({ access_token: 'renewed', refresh_token: 'r2', expires_at: secondsFromNow(600) })
    })
    putTokens({ access_token: 'stale', refresh_token: 'r', expires_at: secondsFromNow(-1) })

    await expect(getStoredToken()).resolves.toBe('renewed')
  })
})
