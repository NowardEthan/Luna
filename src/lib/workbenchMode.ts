export type LunaWorkbenchMode = 'chat' | 'ide'

const STORAGE_KEY = 'luna-workbench-mode'

export function readWorkbenchMode(): LunaWorkbenchMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'ide' ? 'ide' : 'chat'
  } catch {
    return 'chat'
  }
}

export function writeWorkbenchMode(mode: LunaWorkbenchMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}
