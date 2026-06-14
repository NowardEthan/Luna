import type { Timestamp } from 'firebase/firestore'
import type { LunaEntitlements, LunaPlanId } from './entitlements'

export type LunaBillingStatus =
  | 'active'
  | 'overdue'
  | 'cancelled'
  | 'trial'
  | 'expired'

/** Estado de assinatura Asaas em `users/{uid}.billing` (escrito pelo backend). */
export type LunaBillingState = {
  status: LunaBillingStatus
  period?: 'monthly' | 'annual'
  asaasCustomerId?: string
  asaasSubscriptionId?: string
  nextDueDate?: string
  trialEndsAt?: string
  trialUsed?: boolean
  value?: number
  lastEvent?: string
  lastEventAt?: string
}

/** Perfil mínimo em `users/{uid}`. */
export type LunaUserProfile = {
  displayName: string | null
  email: string | null
  photoURL: string | null
  plan: LunaPlanId
  entitlements: LunaEntitlements
  billing?: LunaBillingState | null
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}
/** Metadados de conversa na nuvem (mensagens em subcoleção futura). */
export type LunaCloudConversationMeta = {
  title: string
  folderId: string | null
  pinned: boolean
  updatedAt: Timestamp
  createdAt: Timestamp
}

/** Documento de listing na coleção pública do marketplace. */
export type LunaCloudMarketplaceListing = {
  pluginId: string
  name: string
  description: string
  version: string
  author: string
  category: string
  tags: string[]
  featured: boolean
  installType: 'bundled' | 'disk' | 'url'
  installUrl?: string
  permissions: string[]
  trusted: boolean
  packageStoragePath?: string
  published: boolean
}
