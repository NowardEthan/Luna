import { useSyncExternalStore } from 'react'

export type ForgeComposerMode = 'agent' | 'chat'

const STORAGE_KEY = 'luna-forge-composer-mode'

let mode: ForgeComposerMode = readForgeComposerMode()
const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

export function readForgeComposerMode(): ForgeComposerMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'chat' ? 'chat' : 'agent'
  } catch {
    return 'agent'
  }
}

export function writeForgeComposerMode(next: ForgeComposerMode): void {
  mode = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* ignore */
  }
  emit()
}

export function getForgeComposerMode(): ForgeComposerMode {
  return mode
}

export function subscribeForgeComposerMode(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

export function useForgeComposerMode(): {
  mode: ForgeComposerMode
  setMode: (next: ForgeComposerMode) => void
} {
  const current = useSyncExternalStore(
    subscribeForgeComposerMode,
    getForgeComposerMode,
    getForgeComposerMode,
  )
  return { mode: current, setMode: writeForgeComposerMode }
}

// sync on load
mode = readForgeComposerMode()
