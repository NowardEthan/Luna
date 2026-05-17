import { formatMemoryUiForModel } from './configureMemoriesTool'
import { memoryKindOfNote } from './memoryKinds'
import { deriveTitle } from './conversationStorage'
import type { Conversation, Message } from '../types/chat'
import type { ConversationMemory, MemoryNote, UserMemoryState } from '../types/memory'

const MEMORY_NOTES_FOR_MODEL_MAX_CHARS = 2800
/** Modo agente: system mais leve para caber no orçamento de tokens do pedido. */
export const AGENT_MEMORY_NOTES_MAX_CHARS = 1400
export const AGENT_CROSS_CHAT_DIGEST_MAX_CHARS = 1600
/** Histórico verbatim enviado ao loop do agente (só tail). */
export const AGENT_VERBATIM_MAX_TOKENS = 4500

export function formatMemoryNotesBlock(
  notes: MemoryNote[] | undefined,
  maxChars = MEMORY_NOTES_FOR_MODEL_MAX_CHARS,
): string {
  if (!notes?.length) return ''
  const sorted = [...notes].sort((a, b) => b.createdAt - a.createdAt)
  const header =
    'Notas que você já gravou com save_memory (só use o que está listado; não invente):\n'
  const lines: string[] = [header]
  let used = header.length
  for (const n of sorted) {
    const kind = memoryKindOfNote(n)
    const tagPart =
      n.tags?.length ? ` tags=${n.tags.join(',')}` : ''
    const line = `- [${n.id}] (${kind}) ${n.title}: ${n.detail.replace(/\s+/g, ' ').trim()}${tagPart}\n`
    if (used + line.length > maxChars) break
    lines.push(line)
    used += line.length
  }
  return lines.join('')
}

/** Heurística leve: ~4 chars por token (PT/EN) */
export function estimateTokens(text: string): number {
  if (!text.length) return 0
  return Math.ceil(text.length / 4)
}

export const DEFAULT_CONTEXT_WINDOW_TOKENS = 128_000
export const COMPACTION_THRESHOLD_RATIO = 0.7
export const CROSS_CHAT_DIGEST_MAX_CHARS = 3800
/** Por conversa no digest: resumo rolante ou últimas falas (não só a 1ª mensagem) */
export const CROSS_CHAT_LINE_MAX_CHARS = 520
export const MIN_VERBATIM_TAIL_MESSAGES = 4
export const COMPACTION_CHUNK_MIN_CHARS = 4000
export const COMPACTION_CHUNK_TARGET_CHARS = 14_000

const IMG_PLACEHOLDER = '(imagem anexada)'

export function userContentForLlm(m: Message): string {
  const base = m.text
  const vd = m.visionDescription?.trim()
  if (vd) {
    return `${base}\n\n--- Descrição visual (Lunar Vision) ---\n${vd}`
  }
  return base
}

export function messagesAfterSummaryBoundary(
  messages: Message[],
  summarizedThroughMessageId?: string,
): Message[] {
  if (!summarizedThroughMessageId) return messages
  const idx = messages.findIndex((m) => m.id === summarizedThroughMessageId)
  if (idx === -1) return messages
  return messages.slice(idx + 1)
}

export function firstUserSnippet(conv: Conversation, maxLen: number): string {
  const u = conv.messages.find((m) => m.role === 'user')
  if (!u) return ''
  const t = u.text.replace(/\s+/g, ' ').trim()
  const vd = u.visionDescription?.replace(/\s+/g, ' ').trim()
  const line =
    t && t !== IMG_PLACEHOLDER
      ? t
      : vd
        ? vd
        : ''
  if (!line.length) return ''
  return line.length > maxLen ? `${line.slice(0, maxLen - 1)}…` : line
}

/** Últimas trocas da conversa (mais útil que só a 1ª mensagem do utilizador). */
export function recentDialogueSnippet(
  conv: Conversation,
  maxChars: number,
): string {
  const roleMsgs = conv.messages.filter(
    (m) => m.role === 'user' || m.role === 'assistant',
  )
  const tail = roleMsgs.slice(-8)
  const parts: string[] = []
  let used = 0
  for (let i = tail.length - 1; i >= 0; i--) {
    const m = tail[i]
    const label = m.role === 'user' ? 'Pessoa' : 'Luna'
    let raw = userContentForLlm(m).replace(/\s+/g, ' ').trim()
    if (m.role === 'user' && m.text.trim() === IMG_PLACEHOLDER && m.visionDescription) {
      raw = `(imagem) ${m.visionDescription.replace(/\s+/g, ' ').trim()}`
    }
    if (m.role === 'assistant' && raw === 'Pensando…') continue
    if (!raw.length) continue
    const piece = `${label}: ${raw}`
    const sep = parts.length ? ' · ' : ''
    if (used + sep.length + piece.length > maxChars) {
      if (!parts.length) {
        return piece.length > maxChars
          ? `${piece.slice(0, maxChars - 1)}…`
          : piece
      }
      break
    }
    parts.unshift(piece)
    used += sep.length + piece.length
  }
  const s = parts.join(' · ')
  return s.length > maxChars ? `${s.slice(0, maxChars - 1)}…` : s
}

/** Texto para uma linha do digest entre conversas. */
export function conversationContextBlurb(
  conv: Conversation,
  maxLen: number,
): string {
  const sum = conv.memory?.rollingSummary?.replace(/\s+/g, ' ').trim()
  if (sum) {
    return sum.length > maxLen ? `${sum.slice(0, maxLen - 1)}…` : sum
  }
  return recentDialogueSnippet(conv, maxLen)
}

export function buildCrossChatDigest(
  conversations: Conversation[],
  activeId: string,
  userMemory: UserMemoryState,
  maxChars: number,
): string {
  if (!userMemory.crossChatEnabled) return ''
  const others = [...conversations]
    .filter((c) => c.id !== activeId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 12)

  const lines: string[] = []
  let used = 0
  for (const c of others) {
    const snippet =
      conversationContextBlurb(c, CROSS_CHAT_LINE_MAX_CHARS) ||
      firstUserSnippet(c, 200)
    const title = c.title.replace(/\s+/g, ' ').trim() || deriveTitle(c.messages)
    const line = `- ${title}: ${snippet || '(sem trecho curto)'}`
    if (used + line.length + 1 > maxChars) break
    lines.push(line)
    used += line.length + 1
  }
  if (!lines.length) return ''
  return (
    'Outras conversas neste app (dados só neste computador). ' +
    'Se ela perguntar do que vocês falaram noutro chat ou “antes”, use estes títulos e trechos — não invente o que não aparecer. ' +
    'Se nada aqui servir, peça um resumo gentil.\n' +
    lines.join('\n')
  )
}

export const ROLLING_SUMMARY_LLM_PREFIX =
  'Resumo das mensagens anteriores nesta conversa (não é a mensagem atual dela):\n'

export function formatRollingSummaryBlock(rollingSummary: string): string {
  const t = rollingSummary.replace(/\s+/g, ' ').trim()
  if (!t.length) return ''
  return ROLLING_SUMMARY_LLM_PREFIX + rollingSummary.trim()
}

export type SystemPromptLimits = {
  memoryNotesMaxChars?: number
  crossChatMaxChars?: number
}

export function buildFullSystemPrompt(
  systemCore: string,
  userMemory: UserMemoryState,
  conversations: Conversation[],
  activeId: string,
  rollingSummary: string,
  verticalRecallBlock: string,
  ragBlock: string,
  limits?: SystemPromptLimits,
): string {
  let s = systemCore
  const notesBlock = formatMemoryNotesBlock(
    userMemory.memoryNotes,
    limits?.memoryNotesMaxChars,
  )
  const memoryUiBlock = formatMemoryUiForModel(userMemory.memoryUi)
  const cross = buildCrossChatDigest(
    conversations,
    activeId,
    userMemory,
    limits?.crossChatMaxChars ?? CROSS_CHAT_DIGEST_MAX_CHARS,
  )
  const roll = formatRollingSummaryBlock(rollingSummary)
  const vert = verticalRecallBlock.trim()
  for (const part of [notesBlock, memoryUiBlock, cross, roll, vert]) {
    if (part) s += `\n\n---\n\n${part}`
  }
  if (ragBlock.trim()) s += `\n\n---\n\n${ragBlock.trim()}`
  return s
}

export function estimateApiInputTokens(params: {
  systemContent: string
  userMemoryBlock: string
  crossChatBlock: string
  rollingBlock: string
  verbatimMessages: Message[]
  pendingUserContent: string
}): number {
  let n = estimateTokens(params.systemContent)
  n += estimateTokens(params.userMemoryBlock)
  n += estimateTokens(params.crossChatBlock)
  n += estimateTokens(params.rollingBlock)
  for (const m of params.verbatimMessages) {
    n += estimateTokens(userContentForLlm(m))
  }
  n += estimateTokens(params.pendingUserContent)
  return n
}

/** System já com todos os blocos; só soma mensagens verbatim e o pedido atual. */
export function estimateTotalPromptTokens(
  fullSystem: string,
  verbatimMessages: Message[],
  pendingUserContent: string,
): number {
  let n = estimateTokens(fullSystem)
  for (const m of verbatimMessages) {
    n += estimateTokens(userContentForLlm(m))
  }
  n += estimateTokens(pendingUserContent)
  return n
}

/** Mantém as mensagens mais recentes dentro de um orçamento de tokens (modo agente). */
export function trimMessagesForAgent(
  messages: Message[],
  maxTokens = AGENT_VERBATIM_MAX_TOKENS,
): Message[] {
  if (messages.length <= MIN_VERBATIM_TAIL_MESSAGES) return messages

  const out: Message[] = []
  let total = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    const t = estimateTokens(userContentForLlm(messages[i]))
    if (
      out.length >= MIN_VERBATIM_TAIL_MESSAGES &&
      total + t > maxTokens
    ) {
      break
    }
    total += t
    out.unshift(messages[i])
  }
  return out.length ? out : messages.slice(-MIN_VERBATIM_TAIL_MESSAGES)
}

export function selectCompactionChunk(
  verbatim: Message[],
): { chunk: Message[]; rest: Message[] } | null {
  if (verbatim.length <= MIN_VERBATIM_TAIL_MESSAGES) return null

  const maxTake = verbatim.length - MIN_VERBATIM_TAIL_MESSAGES
  if (maxTake < 1) return null

  let chunkEnd = 0
  let accChars = 0
  for (let i = 0; i < maxTake; i++) {
    accChars += userContentForLlm(verbatim[i]).length
    chunkEnd = i + 1
    if (accChars >= COMPACTION_CHUNK_MIN_CHARS && chunkEnd >= 2) {
      if (accChars >= COMPACTION_CHUNK_TARGET_CHARS) break
    }
  }
  if (chunkEnd < 2 && maxTake >= 2) chunkEnd = 2
  if (chunkEnd < 1) return null
  return {
    chunk: verbatim.slice(0, chunkEnd),
    rest: verbatim.slice(chunkEnd),
  }
}

export function dialogueTextForCompaction(chunk: Message[]): string {
  return chunk
    .map((m) => {
      const label = m.role === 'user' ? 'Usuário' : 'Luna'
      return `${label}: ${userContentForLlm(m)}`
    })
    .join('\n\n')
}

export const COMPACTION_SYSTEM_PROMPT =
  'Você recebe só TROCAS DE DIÁLOGO (mensagens da pessoa e da Luna) e, opcionalmente, um resumo anterior desse mesmo diálogo. ' +
  'Não há aqui instruções internas do app, “código” da assistente nem regras de sistema — isso fica fora e você não deve inventá-las nem misturá-las ao resumo. ' +
  'Prioridade absoluta: preservar o que a PESSOA disse (fatos, pedidos, nomes, datas, limites, emoções, preferências de conversa). ' +
  'Respostas da Luna: comprima bastante; mantenha só conclusões, compromissos ou fatos que ela confirmou e que importem para o fio da conversa; descarte encorajamento genérico repetido. ' +
  'Não invente. Saída em português do Brasil: parágrafos curtos ou marcadores (-), sem cumprimentos meta. ' +
  'Se existir resumo anterior, funda num único texto coerente, sem redundância.'

export function memoryFromCompactionModel(
  modelSummary: string,
  boundaryId: string,
): ConversationMemory {
  return {
    rollingSummary: modelSummary.trim().slice(0, 200_000),
    summarizedThroughMessageId: boundaryId,
    updatedAt: Date.now(),
  }
}
