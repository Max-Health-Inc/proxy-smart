import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('lib/utils - cn', () => {
  it('returns a space-separated string containing provided classes', () => {
    const result = cn('foo', 'bar')
    expect(typeof result).toBe('string')
    expect(result).toContain('foo')
    expect(result).toContain('bar')
  })

  it('ignores falsy values and merges conditional classes', () => {
    const conditional = false
    const result = cn('base', conditional && 'hidden', undefined, null, '', 'visible')
    expect(result).toContain('base')
    expect(result).toContain('visible')
    expect(result).not.toContain('hidden')
  })
})
