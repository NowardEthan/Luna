import { describe, expect, it } from 'vitest'
import {
  normalizeMarketplaceProfile,
  profileSearchText,
} from './marketplaceProfile'

describe('marketplaceProfile', () => {
  it('normalizes rich profile', () => {
    const profile = normalizeMarketplaceProfile({
      longDescription: 'Texto **markdown**',
      publisher: { name: 'Luna', handle: '@luna' },
      highlights: ['Um', 'Dois'],
      features: [{ title: 'Editor', description: 'CodeMirror' }],
      examples: [{ title: 'Ex', code: 'Ctrl+.' }],
      changelog: [{ version: '1.0.0', date: '2026-01-01', notes: 'Launch' }],
    })
    expect(profile?.publisher?.name).toBe('Luna')
    expect(profile?.highlights).toHaveLength(2)
    expect(profileSearchText(profile)).toContain('markdown')
  })

  it('returns undefined for empty profile', () => {
    expect(normalizeMarketplaceProfile({})).toBeUndefined()
  })
})
