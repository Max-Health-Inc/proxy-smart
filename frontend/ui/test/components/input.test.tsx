import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { Input } from '@proxy-smart/shared-ui'

describe('Input', () => {
  it('renders an input with provided placeholder and type', () => {
    render(<Input placeholder="Enter name" type="text" />)

    const input = screen.getByPlaceholderText(/enter name/i)
    expect(input).toBeInTheDocument()
    expect((input as HTMLInputElement).type).toBe('text')
  })

  it('accepts className and forwards props', () => {
    render(<Input placeholder="p" className="test-class" data-testid="my-input" />)

    const input = screen.getByTestId('my-input')
    expect(input).toHaveClass('test-class')
  })

  it('calls onChange when user types and updates value', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(<Input placeholder="type" onChange={handleChange} />)

    const input = screen.getByPlaceholderText(/type/i)
    await user.type(input, 'abc')

    expect(handleChange).toHaveBeenCalled()
    expect((input as HTMLInputElement).value).toBe('abc')
  })

  it('forwards ref to the input element', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Input ref={ref} defaultValue="hello" />)

    expect(ref.current).not.toBeNull()
    expect(ref.current?.value).toBe('hello')
  })
})
