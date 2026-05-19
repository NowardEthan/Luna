import type { FirebaseOptions } from 'firebase/app'

export type LunaFirebasePublicConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  appId: string
  messagingSenderId?: string
  measurementId?: string
}

function env(name: string): string {
  const v = import.meta.env[name]
  return typeof v === 'string' ? v.trim() : ''
}

export function readFirebasePublicConfig(): LunaFirebasePublicConfig | null {
  const apiKey = env('VITE_FIREBASE_API_KEY')
  const projectId = env('VITE_FIREBASE_PROJECT_ID')
  const appId = env('VITE_FIREBASE_APP_ID')

  if (!apiKey || !projectId || !appId) return null

  const authDomain =
    env('VITE_FIREBASE_AUTH_DOMAIN') || `${projectId}.firebaseapp.com`
  const storageBucket =
    env('VITE_FIREBASE_STORAGE_BUCKET') || `${projectId}.appspot.com`

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    appId,
    messagingSenderId:
      env('VITE_FIREBASE_MESSAGING_SENDER_ID') || undefined,
    measurementId: env('VITE_FIREBASE_MEASUREMENT_ID') || undefined,
  }
}

export function toFirebaseOptions(
  cfg: LunaFirebasePublicConfig,
): FirebaseOptions {
  return {
    apiKey: cfg.apiKey,
    authDomain: cfg.authDomain,
    projectId: cfg.projectId,
    storageBucket: cfg.storageBucket,
    appId: cfg.appId,
    messagingSenderId: cfg.messagingSenderId,
    measurementId: cfg.measurementId,
  }
}

export function isFirebaseConfigured(): boolean {
  return readFirebasePublicConfig() !== null
}
