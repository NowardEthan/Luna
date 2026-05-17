export type Role = 'user' | 'assistant'

import type { IdeAttachedContext } from '../lib/ideMentions'
import type { ConversationMemory } from './memory'

/** Imagem anexada numa mensagem do utilizador (JPEG em data URL, persistida no turno). */
export type MessageImageAttachment = {
  id: string
  name: string
  dataUrl: string
}

export type RagCitation = { path: string; preview: string }

export type WebSearchResultItem = {
  title?: string
  url?: string
  hostname?: string
  snippet?: string
}

export type AgentStepDetail =
  | {
      kind: 'web_search'
      query: string
      answer?: string
      results: WebSearchResultItem[]
    }
  | {
      kind: 'search_documents'
      query: string
      citations: RagCitation[]
    }
  | { kind: 'search_past_conversations'; query: string }
  | { kind: 'describe_images'; imageCount: number; focus?: string }
  | { kind: 'save_memory'; preview?: string }
  | {
      kind: 'filesystem'
      action: 'list_directory' | 'read_file'
      path: string
      entryCount?: number
      sampleEntries?: string[]
      error?: string
    }
  | {
      kind: 'glob'
      pattern: string
      root?: string
      paths: string[]
      matchCount: number
      truncated?: boolean
    }
  | {
      kind: 'grep'
      pattern: string
      root?: string
      matches: { path: string; line: number; text: string }[]
      matchCount: number
      truncated?: boolean
    }
  | {
      kind: 'terminal'
      command: string
      exitCode?: number
      stdoutPreview?: string
      stderrPreview?: string
      gui?: boolean
    }
  | {
      kind: 'edit'
      action: 'write_file' | 'apply_patch'
      path: string
      summary?: string
      status: 'pending' | 'applied' | 'failed'
      lineCount?: number
    }
  | {
      kind: 'git'
      action: 'status' | 'diff' | 'commit'
      summary: string
      preview?: string
    }
  | { kind: 'generic'; message: string; error?: string }

/** Pensamento do modelo associado a uma ronda do orquestrador. */
export type ReasoningSegment = {
  round: number
  /** Texto mostrado (traduzido quando aplicável). */
  text: string
  textOriginal?: string
  translated?: boolean
  locale?: string
  inProgress?: boolean
  translating?: boolean
}

export type LlmProviderId = 'groq' | 'together' | 'ollama' | 'openrouter'

export type ReasoningTrace = {
  /** Texto mostrado ao utilizador (após tradução, se aplicável) */
  text: string
  /** Original antes da tradução automática */
  textOriginal?: string
  translated?: boolean
  /** Idioma de exibição após localização (ISO 639-1) */
  locale?: string
  /** @deprecated use locale */
  displayLang?: string
  provider?: LlmProviderId
  effort?: string
}

export type AgentStepRecord = {
  tool: string
  label: string
  summary: string
  ok: boolean
  detail?: AgentStepDetail
  llmProvider?: LlmProviderId
  /** 2+ quando o executor repetiu a mesma tool (retry L1). */
  attempt?: number
  /** Tool id estável do passo original, se retry. */
  retryOf?: string
  /** Ronda LLM do orquestrador neste turno. */
  orchestratorRound?: number
}

export type Message = {
  id: string
  role: Role
  text: string
  /** @mentions IDE (ficheiro, terminal, git, …) */
  ideContexts?: IdeAttachedContext[]
  /** Descrição gerada pela Lunar Vision; o modelo principal só vê texto */
  visionDescription?: string
  /** Miniaturas persistidas após envio (até 5) */
  imageAttachments?: MessageImageAttachment[]
  /** Fontes usadas quando RAG injetou contexto nesta resposta */
  ragCitations?: RagCitation[]
  /** Badge de memória (respostas da assistente) */
  memoryBadge?: 'pending' | 'saved' | 'error'
  /** Ids das notas criadas nesta resposta (quando `saved`) */
  memoryNoteIds?: string[]
  /** Resumo legível para o badge (títulos / trecho do que foi guardado) */
  memorySavedPreview?: string
  /** Ferramentas usadas nesta resposta (modo agente) */
  agentSteps?: AgentStepRecord[]
  /** Passos de tools durante geração (antes da resposta final) */
  agentStepsInProgress?: AgentStepRecord[]
  /** Raciocínio do modelo (separado da resposta) */
  reasoningTrace?: ReasoningTrace
  /** Pensamento por ronda LLM (timeline intercalada com tools). */
  reasoningSegments?: ReasoningSegment[]
  reasoningInProgress?: boolean
  /** Tokens de pensamento ainda a chegar (SSE) */
  reasoningStreamingActive?: boolean
  /** Tradução automática do pensamento em curso */
  reasoningTranslating?: boolean
  /** Resposta ainda a chegar em streaming */
  streamingActive?: boolean
  /** Ronda actual do agente IDE (durante geração). */
  orchestratorRound?: number
  /** Fase do orquestrador IDE (exploring, acting, …). */
  agentPhase?: string
  /** Provedor LLM do turno */
  llmProvider?: LlmProviderId
  usedLlmFallback?: boolean
  /** Erros técnicos do turno (LLM, servidor) para diagnóstico. */
  turnDiagnostics?: TurnDiagnostics
}

export type TurnDiagnostics = {
  llmAttempts?: string[]
  serverLog?: string
  capturedAt?: number
}

/** Pasta para agrupar conversas no histórico (somente cliente) */
export type ChatFolder = {
  id: string
  name: string
  createdAt: number
}

export type Conversation = {
  id: string
  title: string
  /** Fixada no topo do histórico */
  pinned?: boolean
  /** Se true, o título não é sobrescrito automaticamente pelas mensagens */
  titlePinned?: boolean
  /** null = fora de pastas (“Sem pasta”) */
  folderId: string | null
  messages: Message[]
  updatedAt: number
  /** Resumo rolante + fronteira para a API (UI mantém messages completo) */
  memory?: ConversationMemory
}
