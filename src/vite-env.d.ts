/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string
  readonly VITE_FIREBASE_APP_ID?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string
  readonly VITE_FIREBASE_USE_EMULATORS?: string
  readonly VITE_LUNA_MARKETPLACE_CATALOG_URL?: string
  readonly VITE_LUNA_MARKETPLACE_REMOTE?: string
  readonly VITE_LUNA_CLOUD_SYNC?: string
  readonly VITE_LUNA_CLOUD_ANON?: string
  readonly VITE_FIREBASE_APP_CHECK_SITE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
