import { describe, it, expect } from 'vitest'
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
    </div>
  )
}

describe('ThemeProvider', () => {
  it('initializes with defaultTheme and updates DOM and storage when setTheme is called', async () => {
    const user = userEvent.setup()
    // ensure no pre-existing theme
    localStorage.removeItem('vite-ui-theme')

    render(
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <ThemeConsumer />
      </ThemeProvider>
    )

    const status = screen.getByLabelText('theme')
    expect(status).toHaveTextContent('light')
    // should not have dark class initially
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    await user.click(screen.getByRole('button', { name: /set dark/i }))

    expect(localStorage.getItem('vite-ui-theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
