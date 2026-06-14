import { flushSync } from 'react-dom'
import type { Conversation } from '../types/chat'

/** Cede ao browser entre eventos SSE no mesmo chunk TCP. */
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    queueMicrotask(() => resolve())
  })
}

/**
 * Aplica patch de conversa de imediato (fora do batch automático do React 18).
 * Usar só em callbacks de streaming (raciocínio / resposta).
 */
export function flushConversationPatch(
  updateConversation: (
    id: string,
    fn: (c: Conversation) => Conversation | null | undefined,
  ) => void,
  convId: string,
  patch: (c: Conversation) => Conversation,
): void {
  flushSync(() => {
    updateConversation(convId, patch)
  })
}
