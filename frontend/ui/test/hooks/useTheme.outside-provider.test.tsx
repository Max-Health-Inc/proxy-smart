import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { useTheme } from '@/hooks/useTheme'

function ConsumerWithoutProvider() {
  // This usage should throw because no ThemeProvider wraps the component
  const { theme } = useTheme()
  return <div>{theme}</div>
}

describe('useTheme', () => {
  it('throws when used outside of ThemeProvider', () => {
    expect(() => render(<ConsumerWithoutProvider />)).toThrow()
  })
})
