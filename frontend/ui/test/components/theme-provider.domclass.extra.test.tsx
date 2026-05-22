import React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/components/theme-provider'
import { useTheme } from '@/hooks/useTheme'

function ThemeToggler() {
  const { setTheme } = useTheme()
  return (
    <div>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
    </div>
  )
}

// helper to mock prefers-color-scheme
function mockPrefersColorScheme(prefers: 'dark' | 'light' | null) {
  const matches = prefers === 'dark'
  const media = '(prefers-color-scheme: dark)'
  return (query: string) => ({
    matches: query === media ? matches : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })
}

describe('ThemeProvider DOM class toggling (extra)', () => {
  let originalMatchMedia: typeof window.matchMedia

  beforeEach(() => {
    originalMatchMedia = window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: mockPrefersColorScheme('light'),
    })
    localStorage.clear()
    document.documentElement.className = ''
  })

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    })
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('adds the dark class on documentElement when theme set to dark and removes it when set to light', async () => {
    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <ThemeToggler />
      </ThemeProvider>
    )

    const darkBtn = screen.getByRole('button', { name: /set dark/i })
    const lightBtn = screen.getByRole('button', { name: /set light/i })

    // Initially no 'dark' class (system is light)
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    await user.click(darkBtn)
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    await user.click(lightBtn)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('respects system preference when setting theme to system', async () => {
    const user = userEvent.setup()

    // Simulate system preference = dark
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: mockPrefersColorScheme('dark'),
    })

    function SystemSetterConsumer() {
      const { setTheme } = useTheme()
      return <button onClick={() => setTheme('system')}>Set System</button>
    }

    render(
      <ThemeProvider>
        <SystemSetterConsumer />
      </ThemeProvider>
    )

    await user.click(screen.getByRole('button', { name: /set system/i }))
    // Because system prefers dark, the 'dark' class should be present
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
