import { describe, expect, it } from 'vitest'
import { stripUndefinedForFirestore } from './stripUndefined'

describe('stripUndefinedForFirestore', () => {
  it('remove campos undefined no topo e aninhados', () => {
    const input = {
      id: 'c1',
      memory: undefined,
      nested: { a: 1, b: undefined },
    }
    expect(stripUndefinedForFirestore(input)).toEqual({
      id: 'c1',
      nested: { a: 1 },
    })
  })

  it('preserva null', () => {
    expect(stripUndefinedForFirestore({ x: null })).toEqual({ x: null })
  })
})
