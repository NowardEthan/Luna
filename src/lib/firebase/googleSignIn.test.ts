import { afterEach, describe, expect, it, vi } from 'vitest'
import { prefersGoogleRedirect } from './googleSignIn'

describe('prefersGoogleRedirect', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('não usa redirect no Electron', () => {
    vi.stubGlobal('window', {
      electron: { googleSignIn: async () => ({ ok: true, idToken: 'x' }) },
      location: { hostname: '127.0.0.1' },
    })
    expect(prefersGoogleRedirect()).toBe(false)
  })

  it('não usa redirect em localhost', () => {
    vi.stubGlobal('window', {
      location: { hostname: '127.0.0.1' },
    })
    expect(prefersGoogleRedirect()).toBe(false)
  })
})
