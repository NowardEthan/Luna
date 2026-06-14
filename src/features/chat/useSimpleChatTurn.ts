import { useLunaCoreTurn, type SendMessageOptions } from './useLunaCoreTurn'

export type { SendMessageOptions }

type Deps = {
  activeId: string
  conversations: import('../../types/chat').Conversation[]
  updateConversation: (
    conversationId: string,
    updater: (
      c: import('../../types/chat').Conversation,
    ) => import('../../types/chat').Conversation | null | undefined,
  ) => void
}

/** Turno de chat geral via Luna Core (PAIA). */
export function useSimpleChatTurn(deps: Deps) {
  return useLunaCoreTurn(deps)
}
