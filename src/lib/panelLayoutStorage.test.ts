import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  readPanelLayout,
  readPanelSize,
  writePanelLayout,
  writePanelSize,
} from './panelLayoutStorage'

function installLocalStorageMock(): void {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
  })
}

describe('panelLayoutStorage', () => {
  beforeEach(() => {
    installLocalStorageMock()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads legacy numeric px values', () => {
    localStorage.setItem('luna-panel-test', '320')
    expect(readPanelSize('test', -1)).toBe(320)
    expect(readPanelLayout('test')).toEqual({ px: 320 })
  })

  it('round-trips ratio and px as JSON', () => {
    writePanelLayout('ide-chat', { ratio: 0.58, px: 400 })
    expect(readPanelLayout('ide-chat')).toEqual({ ratio: 0.58, px: 400 })
  })

  it('writePanelSize still works', () => {
    writePanelSize('sidebar', 288)
    expect(readPanelLayout('sidebar')).toEqual({ px: 288 })
  })
})
