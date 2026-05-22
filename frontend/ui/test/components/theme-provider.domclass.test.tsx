import React from 'react'
import { describe, it, expect } from 'vitest'
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

describe('ThemeProvider DOM class toggling', () => {
  it('adds and removes the dark class on documentElement when toggling themes', async () => {
    const user = userEvent.setup()

    // Ensure we start from a clean document classList state
    document.documentElement.classList.remove('dark')

    render(
      <ThemeProvider>
        <ThemeToggler />
      </ThemeProvider>
    )

    // Initially should not be dark
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    // Switch to dark
    await user.click(screen.getByRole('button', { name: /set dark/i }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    // Switch back to light
    await user.click(screen.getByRole('button', { name: /set light/i }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
