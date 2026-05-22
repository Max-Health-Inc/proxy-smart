import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { Textarea } from '@/components/ui/textarea'

describe('Textarea', () => {
  it('renders textarea with placeholder and className', () => {
    render(<Textarea placeholder="Write here" className="ta-class" />)

    const ta = screen.getByPlaceholderText(/write here/i)
    expect(ta).toBeInTheDocument()
    expect(ta).toHaveClass('ta-class')
  })

  it('forwards ref to the textarea element', () => {
    const ref = React.createRef<HTMLTextAreaElement>()
    render(<Textarea ref={ref} defaultValue="hello" />)

    expect(ref.current).not.toBeNull()
    expect(ref.current?.value).toBe('hello')
  })
})
