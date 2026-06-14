import type { Message, MessageImageAttachment } from '../types/chat'
import type { ConversationMemory } from '../types/memory'

export type RegenerateResolved = {
  /** Mensagens antes do turno escolhido (tudo depois é descartado). */
  historyWithoutTurn: Message[]
  /** Índice onde o novo par será inserido (= historyWithoutTurn.length). */
  insertAt: number
  userText: string
  visionDescription?: string
  imageAttachments?: MessageImageAttachment[]
  /** Par principal que está a ser refeito. */
  removedUserId: string
  removedAssistantId: string
  /** Todos os ids removidos (turno escolhido + mensagens posteriores). */
  removedMessageIds: string[]
  /** Assistentes removidos — para desfazer memórias (sourceMessageId). */
  removedAssistantIds: string[]
}

/**
 * Resolve o turno a refazer e **trunca** a conversa a partir daí
 * (remove o par escolhido e todas as mensagens posteriores).
 */
export function resolveRegenerateTurn(
  messages: Message[],
  messageId: string,
): RegenerateResolved | null {
  const i = messages.findIndex((m) => m.id === messageId)
  if (i === -1) return null
  const cur = messages[i]

  let uIdx: number
  let aIdx: number

  if (cur.role === 'user') {
    uIdx = i
    const next = messages[i + 1]
    if (!next || next.role !== 'assistant') return null
    aIdx = i + 1
  } else if (cur.role === 'assistant') {
    aIdx = i
    const prev = messages[i - 1]
    if (!prev || prev.role !== 'user') return null
    uIdx = i - 1
  } else {
    return null
  }

  const user = messages[uIdx]
  const assistant = messages[aIdx]
  const tail = messages.slice(uIdx)
  const removedMessageIds = tail.map((m) => m.id)
  const removedAssistantIds = tail
    .filter((m) => m.role === 'assistant')
    .map((m) => m.id)

  const historyWithoutTurn = messages.slice(0, uIdx)

  return {
    historyWithoutTurn,
    insertAt: uIdx,
    userText: user.text,
    visionDescription: user.visionDescription,
    imageAttachments: user.imageAttachments,
    removedUserId: user.id,
    removedAssistantId: assistant.id,
    removedMessageIds,
    removedAssistantIds,
  }
}

export function insertTurnMessages(
  base: Message[],
  insertAt: number,
  userMsg: Message,
  assistantMsgId: string,
  assistantPending?: Partial<Message>,
): Message[] {
  return [
    ...base.slice(0, insertAt),
    userMsg,
    {
      id: assistantMsgId,
      role: 'assistant',
      text: '',
      ...assistantPending,
    },
    ...base.slice(insertAt),
  ]
}

/** Desfaz resumo compactado / memória de conversa afectada pelo corte. */
export function patchMemoryAfterRegenerate(
  memory: ConversationMemory | undefined,
  removedMessageIds: Set<string>,
  truncateAtIndex: number,
  messagesBeforeTruncate: Message[],
): ConversationMemory | undefined {
  if (!memory) return undefined

  let next: ConversationMemory = { ...memory }
  const sid = memory.summarizedThroughMessageId

  if (sid && removedMessageIds.has(sid)) {
    next = {
      ...next,
      summarizedThroughMessageId: undefined,
      rollingSummary: '',
    }
  } else if (sid) {
    const boundaryIdx = messagesBeforeTruncate.findIndex((m) => m.id === sid)
    if (boundaryIdx >= truncateAtIndex) {
      next = {
        ...next,
        summarizedThroughMessageId: undefined,
        rollingSummary: '',
      }
    }
  }

  const truncatedMiddle =
    truncateAtIndex < messagesBeforeTruncate.length - 2
  if (truncatedMiddle && next.rollingSummary?.trim()) {
    next = {
      ...next,
      summarizedThroughMessageId: undefined,
      rollingSummary: '',
    }
  }

  return next
}

/** @deprecated use patchMemoryAfterRegenerate */
export function patchMemoryIfSummarizedRemoved(
  memory: ConversationMemory | undefined,
  removedMessageIds: Set<string>,
): ConversationMemory | undefined {
  if (!memory) return undefined
  const sid = memory.summarizedThroughMessageId
  if (sid && removedMessageIds.has(sid)) {
    return { ...memory, summarizedThroughMessageId: undefined }
  }
  return memory
}
