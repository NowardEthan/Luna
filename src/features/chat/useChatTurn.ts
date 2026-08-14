import { useCallback, useRef } from 'react'
import type { Conversation, Message } from '../../types/chat'
import type { UserMemoryState } from '../../types/memory'
import { readPrimaryView } from '../../lib/primaryView'
import { readWorkbenchMode } from '../../lib/workbenchMode'
import type { LlmSelection } from '../../lib/togetherClient'
import type { ChatPersonalityId } from '../../lib/chatPersonality'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { useAgentTurnService } from '../../_archive/chat-legacy/agentTurnService'
import { useIdeHybridTurn } from './useIdeHybridTurn'
import { useLunaCoreTurn, type SendMessageOptions } from './useLunaCoreTurn'
import { compileChatPipelineOptions } from '../../lib/compileIdeContextForTurn'

export type { SendMessageOptions }

type Deps = {
  activeId: string
  conversations: Conversation[]
  messages: Message[]
  personalityId: ChatPersonalityId
  ragEnabled: boolean
  reasoningEnabled: boolean
  updateConversation: (
    conversationId: string,
    updater: (c: Conversation) => Conversation | null | undefined,
  ) => void
  userMemoryRef: MutableRefObject<UserMemoryState>
  setUserMemory: Dispatch<SetStateAction<UserMemoryState>>
}

function usesFinancesAgentPath(): boolean {
  return readPrimaryView() === 'finances'
}

function usesIdeLunaCorePath(): boolean {
  return readWorkbenchMode() === 'ide'
}

export function useChatTurn(deps: Deps) {
  const llmSelectionRef = useRef<LlmSelection | undefined>(undefined)

  const chat = useLunaCoreTurn({
    activeId: deps.activeId,
    conversations: deps.conversations,
    updateConversation: deps.updateConversation,
    resolvePipelineOptions: async () => compileChatPipelineOptions(),
    reasoningEnabled: deps.reasoningEnabled,
  })

  const ide = useIdeHybridTurn({
    activeId: deps.activeId,
    conversations: deps.conversations,
    messages: deps.messages,
    personalityId: deps.personalityId,
    ragEnabled: deps.ragEnabled,
    reasoningEnabled: deps.reasoningEnabled,
    updateConversation: deps.updateConversation,
    userMemoryRef: deps.userMemoryRef,
    setUserMemory: deps.setUserMemory,
  })

  const financesAgent = useAgentTurnService({
    ...deps,
    llmSelectionRef,
  })

  const sendMessage = useCallback(
    async (
      userText: string,
      images?: { name: string; dataUrl: string }[],
      options?: SendMessageOptions,
    ) => {
      if (usesFinancesAgentPath()) {
        return financesAgent.sendMessage(userText, images, options)
      }
      if (usesIdeLunaCorePath()) {
        return ide.sendMessage(userText, images, options)
      }
      return chat.sendMessage(userText, images)
    },
    [chat, ide, financesAgent],
  )

  const cancelAgentTurn = useCallback(() => {
    chat.cancelAgentTurn()
    ide.cancelAgentTurn()
    financesAgent.cancelAgentTurn()
  }, [chat, ide, financesAgent])

  const redoRegenerateAt = useCallback(
    (messageId: string) => {
      if (usesFinancesAgentPath()) {
        return financesAgent.redoRegenerateAt(messageId)
      }
      return chat.redoRegenerateAt(messageId)
    },
    [chat, financesAgent],
  )

  const chatRef = useRef(chat)
  chatRef.current = chat
  const financesAgentRef = useRef(financesAgent)
  financesAgentRef.current = financesAgent

  const canRedoMessage = useCallback((messageId: string) => {
    if (usesFinancesAgentPath()) {
      return financesAgentRef.current.canRedoMessage(messageId)
    }
    return chatRef.current.canRedoMessage()
  }, [])

  return { sendMessage, cancelAgentTurn, redoRegenerateAt, canRedoMessage }
}
