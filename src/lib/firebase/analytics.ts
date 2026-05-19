import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'
import { getFirebaseApp } from './client'
import { readFirebasePublicConfig } from './config'

let analyticsInstance: Analytics | null = null
let analyticsPromise: Promise<Analytics | null> | null = null

/** Analytics só no browser e quando `measurementId` está configurado. */
export function getLunaAnalytics(): Promise<Analytics | null> {
  if (analyticsPromise) return analyticsPromise

  analyticsPromise = (async () => {
    if (typeof window === 'undefined') return null
    if (!readFirebasePublicConfig()?.measurementId) return null
    if (!(await isSupported())) return null

    const app = getFirebaseApp()
    if (!app) return null

    analyticsInstance = getAnalytics(app)
    return analyticsInstance
  })()

  return analyticsPromise
}
