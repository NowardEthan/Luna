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
  readonly VITE_LUNA_CLOUD_SYNC?: string
  readonly VITE_LUNA_CLOUD_ANON?: string
  readonly VITE_FIREBASE_APP_CHECK_SITE_KEY?: string
  /** Links checkout Asaas (P4) — painel Asaas → Links de pagamento */
  readonly VITE_ASAAS_LINK_PLUS_MONTHLY?: string
  readonly VITE_ASAAS_LINK_PLUS_ANNUAL?: string
  readonly VITE_ASAAS_LINK_PRO_MONTHLY?: string
  readonly VITE_ASAAS_LINK_PRO_ANNUAL?: string
  readonly VITE_ASAAS_LINK_BYOK_MONTHLY?: string
  readonly VITE_ASAAS_LINK_BYOK_ANNUAL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
