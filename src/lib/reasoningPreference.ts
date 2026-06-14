const STORAGE_KEY = 'luna-reasoning-enabled'

export function readReasoningEnabled(): boolean {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (stored === '1') return true
    if (stored === '0') return false
  } catch {
    /* ignore */
  }
  return true
}

export function writeReasoningEnabled(enabled: boolean): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export { STORAGE_KEY as REASONING_STORAGE_KEY }
