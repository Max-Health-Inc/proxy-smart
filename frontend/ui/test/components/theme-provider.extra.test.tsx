import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
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

// helper to mock prefers-color-scheme
function mockMatchMedia(prefersDark: boolean) {
  const mql = {
    matches: prefersDark,
    media: '(prefers-color-scheme: dark)',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onchange: null as unknown as ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(), // deprecated but sometimes used
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    ...mql,
    matches: prefersDark && query.includes('prefers-color-scheme: dark'),
    media: query,
  }))
}

describe('ThemeProvider integration', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    document.documentElement.classList.remove('dark')
    // reset matchMedia to a neutral default
    mockMatchMedia(false)
  })

  it('persists theme to storage and toggles DOM class when setTheme is called', async () => {
    const user = userEvent.setup()

    render(
      <ThemeProvider defaultTheme="light" storageKey="test-theme">
        <ThemeConsumer />
      </ThemeProvider>
    )

    // initial state
    expect(screen.getByLabelText('theme').textContent).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    // set dark
    await user.click(screen.getByRole('button', { name: /set dark/i }))
    expect(screen.getByLabelText('theme').textContent).toBe('dark')
    expect(localStorage.getItem('test-theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    // set light
    await user.click(screen.getByRole('button', { name: /set light/i }))
    expect(screen.getByLabelText('theme').textContent).toBe('light')
    expect(localStorage.getItem('test-theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('system theme follows prefers-color-scheme and stores "system"', async () => {
    const user = userEvent.setup()
    mockMatchMedia(true) // simulate system preference: dark

    render(
      <ThemeProvider defaultTheme="system" storageKey="test-theme">
        <ThemeConsumer />
      </ThemeProvider>
    )

    // ensure system is applied
    await user.click(screen.getByRole('button', { name: /set system/i }))

    // storage keeps the logical selection
    expect(localStorage.getItem('test-theme')).toBe('system')

    // DOM reflects the system preference (dark)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
