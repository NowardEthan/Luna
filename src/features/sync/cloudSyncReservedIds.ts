/**
 * IDs reservados — conversa "financas", "ideias-geral", "rotina-*".
 *
 * Regra HIDE_IN_BOTH (decidida 2026-08-09): ambos apps escondem estes
 * da sidebar geral. Sincronizam no Firestore mas só aparecem em seções
 * dedicadas (Finanças, Ideias, Rotinas).
 *
 * Doc canônico: docs/schema/cloud-conversation.schema.json → x-special-conversation-ids
 */

export const RESERVED_CONVERSATION_IDS = {
  FINANCAS: 'financas',
  IDEIAS_GERAL: 'ideias-geral',
  ROTINA_PREFIX: 'rotina-',
} as const

/**
 * Retorna true se a conversa deve ser escondida da sidebar geral.
 * Use no client (HistoryPanel, useConversations) pra filtrar a lista.
 */
export function isReservedConversationId(id: string): boolean {
  if (id === RESERVED_CONVERSATION_IDS.FINANCAS) return true
  if (id === RESERVED_CONVERSATION_IDS.IDEIAS_GERAL) return true
  if (id.startsWith(RESERVED_CONVERSATION_IDS.ROTINA_PREFIX)) return true
  return false
}

/** Filtra uma lista de conversas removendo as reservadas. Não muta o array original. */
export function filterReservedConversations<T extends { id: string }>(
  conversations: T[],
): T[] {
  return conversations.filter((c) => !isReservedConversationId(c.id))
}