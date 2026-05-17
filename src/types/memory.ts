import type { MemoryKindId } from '../lib/memoryKinds'

export const USER_MEMORY_VERSION = 1 as const

/** Nota explícita gravada via tool `save_memory` (lista na aba Memórias). */
export type MemoryNote = {
  id: string
  title: string
  detail: string
  createdAt: number
  /** Tipo escolhido pela Luna (ou inferido do título em notas antigas). */
  kind?: MemoryKindId
  /** Etiquetas livres (ex.: "lumen", "pt-br") — máx. na sanitização. */
  tags?: string[]
  /** Mensagem assistente onde a nota foi criada (opcional) */
  sourceMessageId?: string
}

/** Preferências do painel Memórias — a Luna ajusta com `configure_memories`. */
export type MemoryUiPrefs = {
  /** Texto curto sob o título do painel (ex.: foco da conversa actual). */
  panelHint?: string
  /** Secção a realçar visualmente. */
  emphasizeKind?: MemoryKindId
}

export type UserMemoryState = {
  version: typeof USER_MEMORY_VERSION
  /** Perfil em markdown; começa vazio */
  profileMarkdown: string
  updatedAt: number
  /** Memória entre conversas no prompt (default true) */
  crossChatEnabled: boolean
  /** Busca em mensagens/resumos antigos pela pergunta atual (default true) */
  conversationSearchEnabled: boolean
  /** Notas atómicas da Luna (tool); máximo aplicado na sanitização */
  memoryNotes?: MemoryNote[]
  /** Layout e mensagens do painel Memórias */
  memoryUi?: MemoryUiPrefs
}
export type ConversationMemory = {
  rollingSummary: string
  /** Última mensagem já coberta pelo resumo; mensagens depois vão verbatim para a API */
  summarizedThroughMessageId?: string
  updatedAt?: number
}
