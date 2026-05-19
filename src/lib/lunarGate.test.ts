import { describe, expect, it } from 'vitest'
import { requiresLunarAccountForProvider } from './lunarGate'

describe('lunarGate', () => {
  it('flags cloud providers', () => {
    expect(requiresLunarAccountForProvider('openrouter')).toBe(true)
    expect(requiresLunarAccountForProvider('ollama')).toBe(false)
    expect(requiresLunarAccountForProvider(undefined)).toBe(false)
  })
})
