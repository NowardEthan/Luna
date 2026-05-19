/** Modo de utilização Luna: offline (local) vs cloud (Conta Lunar). */

export type LunaUsageMode = 'offline' | 'cloud'

const USAGE_MODE_KEY = 'luna-usage-mode'
const GATE_DISMISSED_KEY = 'luna-gate-dismissed'

export function readUsageMode(): LunaUsageMode {
  try {
    const v = localStorage.getItem(USAGE_MODE_KEY)
    if (v === 'offline' || v === 'cloud') return v
  } catch {
    /* ignore */
  }
  return 'cloud'
}

export function writeUsageMode(mode: LunaUsageMode): void {
  try {
    localStorage.setItem(USAGE_MODE_KEY, mode)
  } catch {
    /* ignore */
  }
}

export function readGateDismissed(): boolean {
  try {
    return localStorage.getItem(GATE_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export function writeGateDismissed(): void {
  try {
    localStorage.setItem(GATE_DISMISSED_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function isRealLunarUser(user: {
  isAnonymous: boolean
} | null): boolean {
  return Boolean(user && !user.isAnonymous)
}
