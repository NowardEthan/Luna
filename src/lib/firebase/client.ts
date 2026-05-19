import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
  type Auth,
} from 'firebase/auth'
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from 'firebase/firestore'
import {
  connectStorageEmulator,
  getStorage,
  type FirebaseStorage,
} from 'firebase/storage'
import { isFirebaseConfigured, readFirebasePublicConfig, toFirebaseOptions } from './config'

function initAppCheck(_app: FirebaseApp): void {
  const siteKey = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY
  if (!siteKey || typeof window === 'undefined') return
  try {
    void import('firebase/app-check').then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
      initializeAppCheck(_app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      })
    })
  } catch {
    /* App Check opcional */
  }
}

let appInstance: FirebaseApp | null = null
let emulatorsConnected = false
let authPersistenceReady: Promise<void> | null = null

function ensureAuthPersistence(auth: Auth): Promise<void> {
  if (!authPersistenceReady) {
    authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch(
      () => {
        authPersistenceReady = null
      },
    )
  }
  return authPersistenceReady
}

function useEmulators(): boolean {
  const v = import.meta.env.VITE_FIREBASE_USE_EMULATORS
  return v === '1' || v === 'true'
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null
  if (appInstance) return appInstance

  const cfg = readFirebasePublicConfig()
  if (!cfg) return null

  appInstance =
    getApps().length > 0
      ? getApp()
      : initializeApp(toFirebaseOptions(cfg))

  if (!useEmulators()) {
    initAppCheck(appInstance)
  }

  if (useEmulators() && !emulatorsConnected) {
    connectAuthEmulator(getAuth(appInstance), 'http://127.0.0.1:9099', {
      disableWarnings: true,
    })
    connectFirestoreEmulator(getFirestore(appInstance), '127.0.0.1', 8080)
    connectStorageEmulator(getStorage(appInstance), '127.0.0.1', 9199)
    emulatorsConnected = true
  }

  return appInstance
}

export function getLunaAuth(): Auth | null {
  const app = getFirebaseApp()
  if (!app) return null
  const auth = getAuth(app)
  void ensureAuthPersistence(auth)
  return auth
}

export function getLunaFirestore(): Firestore | null {
  const app = getFirebaseApp()
  return app ? getFirestore(app) : null
}

export function getLunaStorage(): FirebaseStorage | null {
  const app = getFirebaseApp()
  return app ? getStorage(app) : null
}
