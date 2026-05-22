import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@proxy-smart/shared-ui'

describe('Button (extra)', () => {
  it('calls onClick when enabled', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(<Button onClick={handleClick}>Press</Button>)

    const btn = screen.getByRole('button', { name: /press/i })
    await user.click(btn)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(
      <Button onClick={handleClick} disabled>
        Disabled
      </Button>
    )

    const btn = screen.getByRole('button', { name: /disabled/i })
    await user.click(btn)

    expect(handleClick).not.toHaveBeenCalled()
    expect(btn).toBeDisabled()
  })
})
