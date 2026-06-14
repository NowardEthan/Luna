import type { ChatPersonalityId } from '../../lib/chatPersonality'
import type { LlmSelection } from '../../lib/togetherClient'
import type { Conversation, Message } from '../../types/chat'
import type { UserMemoryState } from '../../types/memory'
import type { IdeAttachedContext } from '../../lib/ideMentions'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { LunaCoreResultado } from '../../types/lunaCoreResult'
import { runIdeAgentTurnRunner } from '../chat/ideAgentTurnRunner'
import { buildForgeAgentContext } from './forgeAgentInterpreter'

export type RunForgeAgentTurnInput = {
  convId: string
  assistantMsgId: string
  userMsg: Message
  userText: string
  conversations: Conversation[]
  messages: Message[]
  personalityId: ChatPersonalityId
  ragEnabled: boolean
  reasoningEnabled: boolean
  llmSelection: LlmSelection | undefined
  ideMentions: IdeAttachedContext[]
  coreResult: LunaCoreResultado
  userMemoryRef: MutableRefObject<UserMemoryState>
  setUserMemory: Dispatch<SetStateAction<UserMemoryState>>
  updateConversation: (
    conversationId: string,
    updater: (c: Conversation) => Conversation | null | undefined,
  ) => void
}

/** Agente Forge após o Luna Core (handoff com tools). */
export async function runForgeAgentTurn(
  input: RunForgeAgentTurnInput,
): Promise<void> {
  const ideContextBlock = await buildForgeAgentContext({
    userQuery: input.userText,
    mentions: input.ideMentions,
    ragEnabled: input.ragEnabled,
    coreResult: input.coreResult,
  })

  await runIdeAgentTurnRunner({
    convId: input.convId,
    assistantMsgId: input.assistantMsgId,
    userMsg: input.userMsg,
    conversations: input.conversations,
    messages: input.messages,
    personalityId: input.personalityId,
    ragEnabled: input.ragEnabled,
    reasoningEnabled: input.reasoningEnabled,
    llmSelection: input.llmSelection,
    ideContextBlock,
    ideMentions: input.ideMentions,
    userMemoryRef: input.userMemoryRef,
    setUserMemory: input.setUserMemory,
    updateConversation: input.updateConversation,
  })
}
