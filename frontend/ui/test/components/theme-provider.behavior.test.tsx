import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/components/theme-provider'
import { useTheme } from '@/hooks/useTheme'

function ThemeConsumer() {
  const { theme, setTheme } = useTheme()
  return (
    <div>
      <div aria-label="theme">{theme}</div>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('system')}>Set System</button>
    </div>
  )
}

// Utilities to mock and restore matchMedia
const setupMatchMedia = (prefersDark: boolean) => {
  const mock = vi.fn().mockImplementation((query: string) => ({
    matches: prefersDark && query.includes('prefers-color-scheme: dark'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
  Object.defineProperty(globalThis, 'matchMedia', {
    value: mock,
    configurable: true,
  })
  return mock
}

describe('ThemeProvider behavior', () => {
  const originalLocalStorage = globalThis.localStorage

  beforeEach(() => {
    // Create a simple localStorage mock
    const storage: Record<string, string> = {}
    const mockLocalStorage = {
      clear: vi.fn(() => { Object.keys(storage).forEach(key => delete storage[key]) }),
      getItem: vi.fn((key: string) => storage[key] || null),
      setItem: vi.fn((key: string, value: string) => { storage[key] = value }),
      removeItem: vi.fn((key: string) => { delete storage[key] }),
      key: vi.fn(),
      length: 0,
    }
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
    })
  })

  it('uses system preference (prefers-color-scheme) when no saved theme', () => {
    setupMatchMedia(true) // system prefers dark

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    const themeEl = screen.getByLabelText('theme')
    expect(themeEl).toHaveTextContent('dark')
  })

  it('persists theme to localStorage and rehydrates on remount', async () => {
    setupMatchMedia(false) // ensure a deterministic non-dark default if implementation uses system
    const user = userEvent.setup()

    const { unmount } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    // Change theme to dark
    await user.click(screen.getByText('Set Dark'))
    expect(localStorage.getItem('vite-ui-theme')).toBe('dark')

    // Unmount and remount to verify it picks up saved theme
    unmount()

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    const themeEl = screen.getByLabelText('theme')
    expect(themeEl).toHaveTextContent('dark')
  })
})
