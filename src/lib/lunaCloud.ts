/**
 * Flags e URLs da integração cloud Luna (Firebase).
 * Segredos de Admin SDK ficam só no backend / Cloud Functions — nunca no renderer.
 */

export type LunaCloudConfig = {
  /** Firebase Web SDK configurado (VITE_FIREBASE_*). */
  firebase: boolean
  /** URL JSON do catálogo marketplace (Firestore export ou Hosting). */
  marketplaceCatalogUrl: string | null
  /** Sincronização Firestore de conversas/memórias (futuro). */
  syncEnabled: boolean
  /** Auth anónima permitida em dev (VITE_LUNA_CLOUD_ANON=1). */
  anonAuthEnabled: boolean
}

function envFlag(name: string): boolean {
  const v = import.meta.env[name]
  return v === '1' || v === 'true'
}

function envString(name: string): string | null {
  const v = import.meta.env[name]
  if (typeof v !== 'string' || !v.trim()) return null
  return v.trim()
}

function defaultMarketplaceCatalogUrl(projectId: string): string {
  return `https://${projectId}.web.app/marketplace-catalog.json`
}

export function readLunaCloudConfig(): LunaCloudConfig {
  const projectId = envString('VITE_FIREBASE_PROJECT_ID')
  const apiKey = envString('VITE_FIREBASE_API_KEY')
  const firebase = Boolean(projectId && apiKey)

  const explicitCatalogUrl = envString('VITE_LUNA_MARKETPLACE_CATALOG_URL')
  const remoteInDev = envFlag('VITE_LUNA_MARKETPLACE_REMOTE')
  // Em dev não pede Hosting por defeito (404/CORS até `firebase deploy` + flag explícita).
  const autoHostingUrl =
    projectId &&
    (import.meta.env.PROD || remoteInDev)
      ? defaultMarketplaceCatalogUrl(projectId)
      : null
  const marketplaceCatalogUrl =
    explicitCatalogUrl ?? autoHostingUrl ?? null

  return {
    firebase,
    marketplaceCatalogUrl: firebase ? marketplaceCatalogUrl : null,
    syncEnabled: firebase && envFlag('VITE_LUNA_CLOUD_SYNC'),
    anonAuthEnabled: envFlag('VITE_LUNA_CLOUD_ANON'),
  }
}
