import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { Textarea } from '@proxy-smart/shared-ui'

describe('Textarea', () => {
  it('renders textarea with placeholder', () => {
    render(<Textarea placeholder="Write here" />)
    expect(screen.getByPlaceholderText(/write here/i)).toBeInTheDocument()
  })

  it('forwards ref to the textarea element', () => {
    const ref = React.createRef<HTMLTextAreaElement>()
    render(<Textarea ref={ref} defaultValue="hello" />)

    expect(ref.current).not.toBeNull()
    expect(ref.current?.value).toBe('hello')
  })
})
