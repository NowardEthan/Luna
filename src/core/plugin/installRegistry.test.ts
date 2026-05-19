import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addInstalledPlugin,
  readInstalledPlugins,
  removeInstalledPlugin,
} from './installRegistry'

describe('installRegistry', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
      clear: () => store.clear(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('persists and removes installed plugins', () => {
    addInstalledPlugin({
      id: 'demo',
      rootPath: '/tmp/demo',
      installedAt: '2026-01-01T00:00:00.000Z',
      manifest: {
        id: 'demo',
        name: 'Demo',
        version: '1.0.0',
      },
    })
    expect(readInstalledPlugins()).toHaveLength(1)
    removeInstalledPlugin('demo')
    expect(readInstalledPlugins()).toHaveLength(0)
  })
})
