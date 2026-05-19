/** Chaves localStorage sincronizadas para `users/{uid}/settings/app`. */

export const CLOUD_SETTINGS_KEYS = [
  'luna-selected-model-id',
  'rag-enabled',
  'luna-chat-personality',
  'luna-reasoning-enabled',
  'luna-theme-id',
  'luna-auto-memory-capture',
] as const

export type CloudSettingsSnapshot = Record<string, string>

export function readCloudSettingsSnapshot(): CloudSettingsSnapshot {
  const out: CloudSettingsSnapshot = {}
  for (const key of CLOUD_SETTINGS_KEYS) {
    try {
      const v = localStorage.getItem(key)
      if (v != null) out[key] = v
    } catch {
      /* ignore */
    }
  }
  return out
}

export function applyCloudSettingsSnapshot(snapshot: CloudSettingsSnapshot): void {
  for (const [key, value] of Object.entries(snapshot)) {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* ignore */
    }
  }
}
