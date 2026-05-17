const DEFAULT_BASE = 'http://127.0.0.1:39281'

export function lunaServerBaseUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_BASE
  const fromBridge = window.lunaServer?.baseUrl?.trim()
  if (fromBridge) return fromBridge.replace(/\/$/, '')
  return DEFAULT_BASE
}

export function isLunaServerBridgeAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.lunaServer?.baseUrl)
}
