import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ThemeProvider } from '@/components/theme-provider'
import { useTheme } from '@/hooks/useTheme'

function ConsumerWithoutProvider() {
  // This usage should throw if hook requires ThemeProvider
  const { theme } = useTheme()
  return <div>{theme}</div>
}

describe('useTheme integration', () => {
  it('throws when used outside of ThemeProvider', () => {
    expect(() => render(<ConsumerWithoutProvider />)).toThrow()
  })

  it('works inside ThemeProvider and exposes API', () => {
    function Consumer() {
      const { theme, setTheme } = useTheme()
      return (
        <div>
          <div data-testid="theme">{theme}</div>
          <button onClick={() => setTheme('light')}>light</button>
        </div>
      )
    }

    const { getByTestId } = render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>
    )

    expect(typeof getByTestId('theme').textContent).toBe('string')
  })
})
