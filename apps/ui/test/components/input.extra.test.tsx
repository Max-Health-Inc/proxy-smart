import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@proxy-smart/shared-ui'

describe('Input (extra)', () => {
  it('updates value on typing', async () => {
    const user = userEvent.setup()
    render(<Input placeholder="Type here" />)

    const input = screen.getByPlaceholderText(/type here/i) as HTMLInputElement
    expect(input.value).toBe('')

    await user.type(input, 'Hello')
    expect(input).toHaveValue('Hello')
  })

  it('does not accept input when disabled', async () => {
    const user = userEvent.setup()
    render(<Input placeholder="Disabled" disabled />)

    const input = screen.getByPlaceholderText(/disabled/i) as HTMLInputElement
    expect(input).toBeDisabled()

    await user.type(input, 'Should not type')
    expect(input).toHaveValue('')
  })
})
