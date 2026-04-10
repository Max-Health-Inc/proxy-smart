import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getTheme } from '@/lib/storage'

describe('getTheme (ui/src/lib/storage.ts)', () => {
  const STORAGE_KEY = 'app-theme'

  beforeEach(() => {
    // Ensure a clean localStorage for each test
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('returns the stored theme when a value exists in localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'dark')
    const theme = getTheme(STORAGE_KEY, 'light')
    expect(theme).toBe('dark')
  })

  it('returns the default theme when the storage key is missing', () => {
    // no value set in localStorage
    const theme = getTheme('missing-key', 'light')
    expect(theme).toBe('light')
  })

  it('returns the default theme when localStorage.getItem returns null (simulated)', () => {
    // Spy on getItem to explicitly return null to simulate cleared storage
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => null)
    const theme = getTheme(STORAGE_KEY, 'system')
    expect(spy).toHaveBeenCalledWith(STORAGE_KEY)
    expect(theme).toBe('system')
  })

  // NOTE: We intentionally avoid asserting behavior for unknown/invalid stored values
  // since implementations vary (some return stored value, others validate). If you want
  // a stricter contract, add validation in the implementation and then add tests here.
})
