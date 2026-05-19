import { afterEach, describe, expect, it, vi } from 'vitest'
import { readLunaCloudConfig } from './lunaCloud'

describe('readLunaCloudConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does not auto-fetch hosting catalog in dev without flag', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'key')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'luna-app')
    vi.stubEnv('VITE_FIREBASE_APP_ID', 'app')
    vi.stubEnv('VITE_LUNA_MARKETPLACE_CATALOG_URL', '')
    vi.stubEnv('VITE_LUNA_MARKETPLACE_REMOTE', '')

    expect(readLunaCloudConfig().marketplaceCatalogUrl).toBeNull()
  })

  it('uses hosting URL in dev when VITE_LUNA_MARKETPLACE_REMOTE=1', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'key')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'luna-app')
    vi.stubEnv('VITE_FIREBASE_APP_ID', 'app')
    vi.stubEnv('VITE_LUNA_MARKETPLACE_REMOTE', '1')

    expect(readLunaCloudConfig().marketplaceCatalogUrl).toBe(
      'https://luna-app.web.app/marketplace-catalog.json',
    )
  })

  it('prefers explicit marketplace URL', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'key')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'luna-app')
    vi.stubEnv('VITE_FIREBASE_APP_ID', 'app')
    vi.stubEnv(
      'VITE_LUNA_MARKETPLACE_CATALOG_URL',
      'https://cdn.example.com/catalog.json',
    )

    expect(readLunaCloudConfig().marketplaceCatalogUrl).toBe(
      'https://cdn.example.com/catalog.json',
    )
  })
})
