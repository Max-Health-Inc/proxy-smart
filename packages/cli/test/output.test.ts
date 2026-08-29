import { describe, expect, it } from 'bun:test'
import { deriveColumns } from '../src/output'
import { flagList } from '../src/args'

describe('deriveColumns', () => {
  it('returns scalar keys in first-seen order', () => {
    const rows = [{ id: '1', name: 'Alpha', enabled: true }]
    expect(deriveColumns(rows)).toEqual(['id', 'name', 'enabled'])
  })

  it('treats string, number, boolean and null as scalar', () => {
    const rows = [{ s: 'x', n: 3, b: false, nil: null }]
    expect(deriveColumns(rows)).toEqual(['s', 'n', 'b', 'nil'])
  })

  it('skips non-scalar values (objects and arrays)', () => {
    const rows = [{ id: '1', tags: ['a', 'b'], meta: { x: 1 }, name: 'Alpha' }]
    expect(deriveColumns(rows)).toEqual(['id', 'name'])
  })

  it('unions keys across rows, preserving first-seen order', () => {
    const rows = [
      { id: '1', name: 'Alpha' },
      { id: '2', enabled: true },
    ]
    expect(deriveColumns(rows)).toEqual(['id', 'name', 'enabled'])
  })

  it('picks up a key from a later row when it was non-scalar earlier', () => {
    const rows = [
      { id: '1', extra: { nested: true } },
      { id: '2', extra: 'now-scalar' },
    ]
    expect(deriveColumns(rows)).toEqual(['id', 'extra'])
  })

  it('caps the derived column count at six', () => {
    const rows = [{ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8 }]
    expect(deriveColumns(rows)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  it('returns an empty list when no scalar columns exist', () => {
    const rows = [{ obj: { x: 1 }, arr: [1, 2] }]
    expect(deriveColumns(rows)).toEqual([])
  })

  it('returns an empty list for empty input', () => {
    expect(deriveColumns([])).toEqual([])
  })
})

describe('flagList', () => {
  it('splits a comma-separated value and trims entries', () => {
    expect(flagList({ columns: 'id, name ,enabled' }, 'columns')).toEqual([
      'id',
      'name',
      'enabled',
    ])
  })

  it('returns undefined when the flag is absent', () => {
    expect(flagList({}, 'columns')).toBeUndefined()
  })

  it('returns undefined for a boolean-only flag', () => {
    expect(flagList({ columns: true }, 'columns')).toBeUndefined()
  })

  it('returns undefined when only empty entries are present', () => {
    expect(flagList({ columns: ' , ,' }, 'columns')).toBeUndefined()
  })
})
