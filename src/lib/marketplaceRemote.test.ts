import { describe, expect, it, vi, afterEach } from 'vitest'
import { fetchRemoteMarketplaceCatalog } from './marketplaceRemote'

describe('fetchRemoteMarketplaceCatalog', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses valid catalog JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          version: 2,
          updatedAt: '2026-05-18',
          items: [
            {
              id: 'demo',
              pluginId: 'demo',
              name: 'Demo',
              description: 'Test',
              version: '1.0.0',
              author: 'Luna',
              category: 'demo',
              tags: [],
              featured: false,
              install: { type: 'bundled' },
              permissions: [],
              trusted: true,
            },
          ],
        }),
      }),
    )

    const catalog = await fetchRemoteMarketplaceCatalog(
      'https://example.com/catalog.json',
    )
    expect(catalog?.items).toHaveLength(1)
    expect(catalog?.items[0]?.pluginId).toBe('demo')
  })

  it('returns null on HTTP error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false }),
    )
    const catalog = await fetchRemoteMarketplaceCatalog('https://example.com/x')
    expect(catalog).toBeNull()
  })
})
