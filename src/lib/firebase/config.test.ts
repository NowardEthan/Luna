import { describe, expect, it, vi, afterEach } from 'vitest'
import { isFirebaseConfigured, readFirebasePublicConfig } from './config'

describe('firebase config', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns null when required keys are missing', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', '')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', '')
    vi.stubEnv('VITE_FIREBASE_APP_ID', '')
    expect(readFirebasePublicConfig()).toBeNull()
    expect(isFirebaseConfigured()).toBe(false)
  })

  it('builds config with defaults for auth and storage domains', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'key')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'luna-dev')
    vi.stubEnv('VITE_FIREBASE_APP_ID', 'app')
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', '')
    vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', '')

    const cfg = readFirebasePublicConfig()
    expect(cfg).toMatchObject({
      apiKey: 'key',
      projectId: 'luna-dev',
      appId: 'app',
      authDomain: 'luna-dev.firebaseapp.com',
      storageBucket: 'luna-dev.appspot.com',
    })
    expect(isFirebaseConfigured()).toBe(true)
  })
})
