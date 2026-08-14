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
  // Fase 5 — espelhar OrbitLab. Editáveis via updateCloudProfile.
  username?: string | null
  bio?: string | null
  /** Espelha photoURL; Lab usa esse nome. Set automático em ensureUserProfile. */
  avatarUrl?: string | null
  /** Cover image URL — não usado pelo legacy hoje, mas o Lab tem. */
  coverUrl?: string | null
}

// ──────────────────────────────────────────────────────────────────────────
// CloudConversationMeta — users/{uid}/conversations/{conversationId}
// Schema version 2 (subcoleção de messages). NÃO inclui messages inline.
// Doc canônico congelado em docs/schema/cloud-conversation.schema.json
// ──────────────────────────────────────────────────────────────────────────

export type ConversationSourceModeCloud = 'chat' | 'ide'

export type CloudConversationMeta = {
  schemaVersion: 2
  title: string
  preview: string
  lunaSessaoId: string
  createdAt: Timestamp
  updatedAt: Timestamp
  messageCount: number
  titleLocked: boolean
  deletedAt: Timestamp | null
  deletedMessageIds: string[]

  // LEGACY-ONLY — Lab ignora, legacy escreve
  sourceMode?: ConversationSourceModeCloud
  workspaceRoot?: string | null
  folderId?: string | null
  pinned?: boolean
  tags?: string[]

  // LEGACY-WRITTEN — legacy atualiza em todo push; Lab pode ler pra resolver last-write-wins
  cloudUpdatedAt?: Timestamp
}

// ──────────────────────────────────────────────────────────────────────────
// CloudMessage — users/{uid}/conversations/{conversationId}/messages/{messageId}
// Doc canônico congelado em docs/schema/cloud-message.schema.json
// ──────────────────────────────────────────────────────────────────────────

export type CloudMessageRole = 'user' | 'luna'

export type CloudAttachment = {
  id: string
  kind: 'image' | 'file'
  name: string
  size?: number
  mime?: string
  /** URL do Firebase Storage — só presente após upload completo */
  uri?: string
}

export type CloudRagCitation = {
  source: string
  excerpt: string
  url?: string
  score?: number
}

export type CloudResearchSource = {
  url: string
  title?: string
}

export type CloudResearchStep = {
  ferramenta:
    | 'web_search'
    | 'ler_url'
    | 'ver_imagem'
    | 'ver_video'
    | 'consultar_atlas'
    | string
  argumento: string
  sucesso: boolean
  fontes?: CloudResearchSource[]
}

export type CloudPlanStep = {
  texto: string
  feito: boolean
}

export type CloudFluxSegment =
  | { t: 'n'; texto: string }
  | { t: 'a'; i: number }

export type CloudGeneratedImage = {
  url: string
  prompt?: string
}

export type CloudReferenceMessage = {
  kind: 'message'
  messageId: string
  role: CloudMessageRole
  messageIndex: number
  excerpt?: string
  fullText?: string
}

export type CloudReferenceDocument = {
  kind: 'document'
  messageId: string
  role: string
  messageIndex: number
  excerpt?: string
  attachmentId: string
  attachmentName?: string
  attachmentUri?: string
}

export type CloudReferenceArtefato = {
  kind: 'artefato'
  messageId: string
  role: 'user'
  messageIndex?: number
  documentoId: string
  titulo?: string
  trecho?: string
  excerpt?: string
}

export type CloudReference =
  | CloudReferenceMessage
  | CloudReferenceDocument
  | CloudReferenceArtefato

export type CloudMessage = {
  role: CloudMessageRole
  text: string
  createdAt: Timestamp

  // Reasoning + research (Lab e legacy compartilham)
  reasoning?: string

  // Lab-only (legacy escreve se vier, mas não é gerado pelo desktop)
  research?: CloudResearchStep[]
  plano?: CloudPlanStep[]
  fluxo?: CloudFluxSegment[]
  imagens?: CloudGeneratedImage[]

  // Compartilhado
  attachments?: CloudAttachment[]
  reference?: CloudReference
  ragCitations?: CloudRagCitation[]
  llmProvider?: string
}

// Mantém compat com import que existia antes da Fase 1
/** @deprecated use CloudConversationMeta */
export type LunaCloudConversationMeta = CloudConversationMeta

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