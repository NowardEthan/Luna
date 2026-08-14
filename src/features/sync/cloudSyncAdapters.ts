/**
 * cloudSyncAdapters — conversores entre Conversation/Message (local, rico)
 * e CloudConversationMeta/CloudMessage (sync, subconjunto compartilhado).
 *
 * Doc canônico: docs/schema/cloud-{conversation,message}.schema.json
 *
 * Campos desktop-only (agentSteps, ideContexts, visionDescription,
 * memoryBadge, lunaPipelineTrace, streamingActive, ...) ficam só no client.
 * Subir pro Firestore só o que faz sentido em ambos apps (Lab + legacy).
 *
 * IMPORTANTE: o Message local não tem `createdAt` (só ChatFolder tem). A
 * posição no array vira o proxy de ordem; o Firestore gera o timestamp via
 * serverTimestamp(). Pra ordenação na UI, mantemos a ordem do array.
 */
import {
  increment,
  serverTimestamp,
  Timestamp,
  type Timestamp as FsTimestamp,
} from 'firebase/firestore'
import type {
  CloudAttachment,
  CloudConversationMeta,
  CloudMessage,
} from '../../lib/firebase/types'
import type { Conversation, Message } from '../../types/chat'

const MAX_TITLE = 48
const MAX_PREVIEW = 120

/** Deriva preview (120 chars da última mensagem user/assistant). */
export function derivePreview(messages: Message[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role === 'user' || m.role === 'assistant') {
      const text = m.text?.trim()
      if (text) return text.slice(0, MAX_PREVIEW)
    }
  }
  return ''
}

/** Index-based timestamp: usamos positionInArray * 1ms pra criar um ordering estável. */
function toTimestampForMessage(index: number, fallback?: number): FsTimestamp {
  // Usa Date.now() + index pra ter timestamp monotônico crescente
  const base = fallback ?? Date.now()
  const ms = base - (1_000_000 - index) // garante que mensagens anteriores têm ms menor
  return Timestamp.fromMillis(ms)
}

function toTimestampFromMs(ms: number | undefined): FsTimestamp {
  if (typeof ms === 'number' && Number.isFinite(ms)) return Timestamp.fromMillis(ms)
  return serverTimestamp() as unknown as FsTimestamp
}

/**
 * Constrói CloudConversationMeta a partir de uma Conversation local.
 * NÃO inclui messages (vão pra subcoleção) nem campos desktop-only.
 */
export function buildCloudMeta(conv: Conversation): CloudConversationMeta {
  const updatedMs = typeof conv.updatedAt === 'number' ? conv.updatedAt : Date.now()
  // createdAt: usa updatedAt -1s como heurística; ou usa Date.now() pra conversas novas
  const createdMs = updatedMs - 1000

  const meta: CloudConversationMeta = {
    schemaVersion: 2,
    title: (conv.title ?? '').slice(0, MAX_TITLE).trim() || 'Conversa',
    preview: derivePreview(conv.messages),
    lunaSessaoId: conv.lunaSessaoId ?? conv.id,
    createdAt: toTimestampFromMs(createdMs),
    updatedAt: toTimestampFromMs(updatedMs),
    messageCount: conv.messages.length,
    titleLocked: conv.titlePinned ?? false,
    deletedAt: null,
    deletedMessageIds: [],
    cloudUpdatedAt: serverTimestamp() as unknown as FsTimestamp,
  }

  // LEGACY-ONLY — Lab ignora
  if (conv.sourceMode) meta.sourceMode = conv.sourceMode
  if (conv.workspaceRoot !== undefined) meta.workspaceRoot = conv.workspaceRoot ?? null
  if (conv.folderId !== undefined) meta.folderId = conv.folderId ?? null
  if (typeof conv.pinned === 'boolean') meta.pinned = conv.pinned
  if (conv.tags && conv.tags.length > 0) meta.tags = conv.tags.slice(0, 8)

  return meta
}

/**
 * Patch para escrever no doc da conversa quando já existe.
 * P1: usa FieldValue.increment(delta) pra messageCount em vez de valor absoluto —
 * isso evita race condition quando Lab e legacy escrevem no mesmo doc em paralelo
 * (Lab também usa increment). delta = localCount - remoteCount.
 *
 * Demais campos são mergeados (não zera nada).
 */
export function buildCloudMetaIncrement(
  conv: Conversation,
  delta: number,
): Record<string, unknown> {
  const updatedMs = typeof conv.updatedAt === 'number' ? conv.updatedAt : Date.now()
  const patch: Record<string, unknown> = {
    messageCount: increment(delta),
    updatedAt: toTimestampFromMs(updatedMs),
    cloudUpdatedAt: serverTimestamp(),
  }
  // Title/preview/titleLocked só atualiza se Lab não tiver titleLocked=true
  // (Lab usa o mesmo nome de campo). Como o Lab também respeita titleLocked,
  // não vamos sobrescrever aqui — só setamos em conversas criadas pelo legacy
  // (ensure).
  return patch
}

// ──────────────────────────────────────────────────────────────────────────
// Message → CloudMessage
// ──────────────────────────────────────────────────────────────────────────

/**
 * Converte um Message local pra CloudMessage. NÃO inclui campos desktop-only.
 * Strippeado: agentSteps, agentStepsInProgress, ideContexts, visionDescription,
 * memoryBadge, reasoningTrace, reasoningSegments, lunaPipelineTrace, turnDiagnostics.
 *
 * @param msg Message local
 * @param index posição no array da conversa (proxy de ordem temporal)
 */
export function messageToCloud(msg: Message, index: number): CloudMessage {
  // P2: Lab/Railway gravam 'luna' pra role=assistant. Alinhar pra evitar
  // dois valores diferentes no Firestore pra mesma coisa.
  const cloudRole: 'user' | 'luna' = msg.role === 'assistant' ? 'luna' : 'user'

  const out: CloudMessage = {
    role: cloudRole,
    text: msg.text?.trim() ?? '',
    createdAt: toTimestampForMessage(index),
  }

  if (msg.reasoningTrace?.text) out.reasoning = msg.reasoningTrace.text
  if (msg.ragCitations && msg.ragCitations.length > 0) {
    // Legacy RagCitation = { path, preview }; CloudRagCitation = { source, excerpt, url?, score? }
    out.ragCitations = msg.ragCitations.map((c) => ({
      source: c.path,
      excerpt: c.preview,
    }))
  }
  if (msg.llmProvider) out.llmProvider = msg.llmProvider

  // Attachments — converter de imageAttachments (legacy tem data URL; sem uri remoto)
  if (msg.imageAttachments && msg.imageAttachments.length > 0) {
    const atts: CloudAttachment[] = msg.imageAttachments.map((a) => ({
      id: a.id ?? crypto.randomUUID(),
      kind: 'image' as const,
      name: a.name ?? 'image',
      // size/mime/uri desconhecidos no formato data URL — deixa undefined
    }))
    out.attachments = atts
  }

  // research/plano/fluxo/imagens/reference — não temos no legacy; deixar vazio.
  // O Lab não exige esses campos, então omite.

  return out
}

// ──────────────────────────────────────────────────────────────────────────
// CloudMessage → Message
// ──────────────────────────────────────────────────────────────────────────

function timestampToMs(ts: unknown): number | undefined {
  if (!ts) return undefined
  if (ts instanceof Date) return ts.getTime()
  const t = ts as { toMillis?: () => number }
  if (typeof t.toMillis === 'function') return t.toMillis()
  return undefined
}

/**
 * Converte CloudMessage (Firestore) pra Message local. Campos desktop-only
 * ficam vazios (o user vai perceber que não tem agentSteps vindo do Lab).
 *
 * Normaliza role: 'luna' (legado Lab) → 'assistant' (legacy).
 */
export function messageFromCloud(id: string, data: CloudMessage): Message {
  const createdMs = timestampToMs(data.createdAt) ?? Date.now()

  const role: 'user' | 'assistant' =
    (data.role as string) === 'luna'
      ? 'assistant'
      : (data.role as 'user' | 'assistant')

  const msg: Message = {
    id,
    role,
    text: data.text ?? '',
    streamingActive: false,
  }

  // Message local não tem createdAt — guardamos em uma annotation? Por ora
  // deixamos o array order cuidar. Pra ordernar depois, usar position do array.
  void createdMs

  if (data.llmProvider) msg.llmProvider = data.llmProvider as Message['llmProvider']

  if (data.ragCitations && data.ragCitations.length > 0) {
    msg.ragCitations = data.ragCitations.map((c) => ({
      path: c.source,
      preview: c.excerpt,
    }))
  }

  if (data.attachments && data.attachments.length > 0) {
    // CloudAttachment não tem dataUrl; criamos stub com dataUrl vazio pra
    // satisfazer o tipo. UI vai mostrar erro de imagem — TODO Fase 4: resolver.
    msg.imageAttachments = data.attachments
      .filter((a) => a.kind === 'image')
      .map((a) => ({
        id: a.id,
        name: a.name,
        dataUrl: '', // placeholder — Lab deveria mandar uri remoto em a.uri
      }))
  }

  // Reasoning do Lab pode vir como string em data.reasoning
  if (data.reasoning) {
    msg.reasoningTrace = {
      text: data.reasoning,
    }
  }

  return msg
}

// ──────────────────────────────────────────────────────────────────────────
// CloudConversationMeta + messages[] → Conversation local
// ──────────────────────────────────────────────────────────────────────────

/**
 * Reassembla Conversation local a partir de CloudConversationMeta + messages
 * já baixadas da subcoleção.
 */
export function conversationFromCloud(
  id: string,
  meta: CloudConversationMeta,
  messages: Message[],
): Conversation {
  const updatedMs = timestampToMs(meta.updatedAt) ?? Date.now()

  const conv: Conversation = {
    id,
    title: meta.title,
    folderId: meta.folderId ?? null, // Conversation exige folderId (não opcional)
    messages,
    updatedAt: updatedMs,
  }

  if (meta.lunaSessaoId) conv.lunaSessaoId = meta.lunaSessaoId
  if (typeof meta.pinned === 'boolean') conv.pinned = meta.pinned
  if (meta.tags && meta.tags.length > 0) conv.tags = meta.tags
  if (meta.titleLocked) conv.titlePinned = true
  if (meta.sourceMode) conv.sourceMode = meta.sourceMode
  if (meta.workspaceRoot !== undefined) conv.workspaceRoot = meta.workspaceRoot

  // cloudSync.enabled=true (essa conversa veio do cloud, então tem sync)
  conv.cloudSync = { enabled: true }

  return conv
}