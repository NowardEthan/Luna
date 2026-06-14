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

function storageMarketplaceCatalogUrl(bucket: string): string {
  const encoded = encodeURIComponent('marketplace/marketplace-catalog.json')
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media`
}

export function readLunaCloudConfig(): LunaCloudConfig {
  const projectId = envString('VITE_FIREBASE_PROJECT_ID')
  const apiKey = envString('VITE_FIREBASE_API_KEY')
  const firebase = Boolean(projectId && apiKey)

  const explicitCatalogUrl = envString('VITE_LUNA_MARKETPLACE_CATALOG_URL')
  const storageBucket = envString('VITE_FIREBASE_STORAGE_BUCKET')
  const preferStorage = envFlag('VITE_LUNA_MARKETPLACE_CATALOG_STORAGE')
  const storageCatalogUrl =
    storageBucket && preferStorage ? storageMarketplaceCatalogUrl(storageBucket) : null
  const autoHostingUrl = projectId
    ? defaultMarketplaceCatalogUrl(projectId)
    : null
  const marketplaceCatalogUrl =
    explicitCatalogUrl ?? storageCatalogUrl ?? autoHostingUrl ?? null

  return {
    firebase,
    marketplaceCatalogUrl: firebase ? marketplaceCatalogUrl : null,
    syncEnabled: firebase && envFlag('VITE_LUNA_CLOUD_SYNC'),
    anonAuthEnabled: envFlag('VITE_LUNA_CLOUD_ANON'),
  }
}
