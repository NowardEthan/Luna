import { afterEach, describe, expect, it, vi } from 'vitest'
import { readLunaCloudConfig } from './lunaCloud'

describe('readLunaCloudConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses hosting URL when Firebase project is configured', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'key')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'luna-app')
    vi.stubEnv('VITE_FIREBASE_APP_ID', 'app')
    vi.stubEnv('VITE_LUNA_MARKETPLACE_CATALOG_URL', '')

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

  it('returns null catalog URL without Firebase', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', '')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '')

    expect(readLunaCloudConfig().marketplaceCatalogUrl).toBeNull()
  })
})
