import { describe, expect, it } from 'vitest'
import { getMentionTrigger, insertMention } from './ideMentionAutocomplete'

describe('ideMentionAutocomplete', () => {
  it('detects @ query before cursor', () => {
    const text = 'olá @src/App'
    const t = getMentionTrigger(text, text.length)
    expect(t?.query).toBe('src/App')
  })

  it('inserts mention with trailing space', () => {
    const text = 'ver @src'
    const t = getMentionTrigger(text, text.length)!
    const { next, cursor } = insertMention(text, t, 'src/App.tsx')
    expect(next).toBe('ver @src/App.tsx ')
    expect(cursor).toBe(next.length)
  })
})
