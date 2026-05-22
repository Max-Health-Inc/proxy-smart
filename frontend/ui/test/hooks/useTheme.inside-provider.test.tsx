import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

describe('useTheme (inside ThemeProvider)', () => {
  it('provides theme and updates when setTheme is called', async () => {
    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    )

    const themeNode = screen.getByLabelText('theme')
    expect(themeNode).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Set Dark/i }))
    expect(themeNode).toHaveTextContent('dark')

    await user.click(screen.getByRole('button', { name: /Set Light/i }))
    expect(themeNode).toHaveTextContent('light')

    await user.click(screen.getByRole('button', { name: /Set System/i }))
    await waitFor(() => expect(themeNode).toHaveTextContent(/^(light|dark)$/))

    // Removed brittle assertion that final theme must differ from initial, since it can legitimately return to the initial value.

  })
})
