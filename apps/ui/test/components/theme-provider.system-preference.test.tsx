import React from 'react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/components/theme-provider'
import { useTheme } from '@/hooks/useTheme'

// Helper to mock matchMedia with change listeners
function mockMatchMedia(initialDark: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = []
  const mql: MediaQueryList & { dispatch: (matches: boolean) => void } = {
    matches: initialDark,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (_: 'change', cb: (e: MediaQueryListEvent) => void) => {
      listeners.push(cb)
    },
    removeEventListener: (_: 'change', cb: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(cb)
      if (idx >= 0) listeners.splice(idx, 1)
    },
    // addListener/removeListener for older implementations
    addListener: (cb: (e: MediaQueryListEvent) => void) => {
      listeners.push(cb)
    },
    removeListener: (cb: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(cb)
      if (idx >= 0) listeners.splice(idx, 1)
    },
    dispatch: (matches: boolean) => {
      // update matches and notify listeners
      ;(mql as MediaQueryList & { matches: boolean }).matches = matches
      const event = { matches } as MediaQueryListEvent
      listeners.forEach((cb) => cb(event))
      if (typeof mql.onchange === 'function') mql.onchange(event)
    },
  } as MediaQueryList & { dispatch: (matches: boolean) => void }

  const stub = vi.fn().mockImplementation(() => mql) as typeof window.matchMedia
  vi.stubGlobal('matchMedia', stub)
  return mql
}

function ThemeConsumer() {
  const { theme, setTheme } = useTheme()
  return (
    <div>
      <div aria-label="theme">{theme}</div>
      <button onClick={() => setTheme('system')}>Set System</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
    </div>
  )
}

describe('ThemeProvider system preference behavior', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('applies system dark preference and updates when OS preference changes', async () => {
    const mql = mockMatchMedia(true) // system prefers dark initially
    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    // Switch to system mode explicitly to ensure following matchMedia
    await user.click(screen.getByRole('button', { name: /Set System/i }))

    // Should have dark class when system prefers dark
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    // Simulate system switching to light
    mql.dispatch(false)

    // Should remove dark class when system preference is light
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('respects explicit user override even if system preference is dark', async () => {
    const mql = mockMatchMedia(true) // system prefers dark
    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    // User explicitly sets light
    await user.click(screen.getByRole('button', { name: /Set Light/i }))

    // Should not have dark class after explicit light selection
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    // Now simulate system preference toggle; explicit user preference should persist
    mql.dispatch(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
