import { describe, expect, it } from 'vitest'
import { patchMemoryNote } from './patchMemoryNote'
import type { MemoryNote } from '../types/memory'

const base: MemoryNote = {
  id: 'n1',
  title: 'Título',
  detail: 'Detalhe',
  createdAt: 1,
  kind: 'preference',
  tags: ['a'],
}

describe('patchMemoryNote', () => {
  it('updates title and kind', () => {
    const next = patchMemoryNote(base, {
      title: 'Novo título',
      kind: 'project',
    })
    expect(next?.title).toBe('Novo título')
    expect(next?.kind).toBe('project')
    expect(next?.detail).toBe('Detalhe')
  })

  it('rejects empty note', () => {
    expect(patchMemoryNote(base, { title: '', detail: '' })).toBeNull()
  })

  it('sanitizes tags', () => {
    const next = patchMemoryNote(base, {
      tags: ['react', 'react', '  long-tag '.repeat(20)],
    })
    expect(next?.tags?.length).toBeLessThanOrEqual(8)
    expect(next?.tags?.[0]).toBe('react')
  })
})
