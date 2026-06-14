import { memo, useMemo } from 'react'
import { StatusBar } from '../StatusBar'
import { useDebouncedComposerDraft } from '../../hooks/useDebouncedComposerDraft'
import { buildContextUsageSnapshot } from '../../lib/contextUsageEstimate'
import { getIdeTurnHost } from '../../lib/ideTurnHost'
import type { ContextUsageSnapshot } from '../../lib/contextUsageEstimate'
import type { Conversation } from '../../types/chat'
import type { ConversationMemory, UserMemoryState } from '../../types/memory'
import type { LunaModelOption } from '../../lib/llmModelSelection'
import type { LunaPrimaryView } from '../../lib/primaryView'
import type { LunaWorkbenchMode } from '../../lib/workbenchMode'
import type { Message } from '../../types/chat'
import type { ChatPersonalityId } from '../../lib/chatPersonality'

type Props = {
  workbenchMode: LunaWorkbenchMode
  primaryView: LunaPrimaryView
  serverOk: boolean | null
  serverChecking?: boolean
  activeId: string | null
  messages: Message[]
  conversations: Conversation[]
  conversationMemory?: ConversationMemory
  userMemory: UserMemoryState
  personalityId: ChatPersonalityId
  financesAgentMode: boolean
  modelCatalog?: LunaModelOption[]
  selectedModelId?: string | null
  fixedModelLabel?: string
  onOpenLunarAccount?: () => void
  onOpenBilling?: () => void
}

function ChatStatusBarInner({
  workbenchMode,
  primaryView,
  serverOk,
  serverChecking,
  activeId,
  messages,
  conversations,
  conversationMemory,
  userMemory,
  personalityId,
  financesAgentMode,
  modelCatalog,
  selectedModelId,
  fixedModelLabel,
  onOpenLunarAccount,
  onOpenBilling,
}: Props) {
  const debouncedDraft = useDebouncedComposerDraft(300)

  const contextUsage: ContextUsageSnapshot | null = useMemo(
    () =>
      activeId
        ? buildContextUsageSnapshot({
            workbenchMode,
            primaryView,
            messages,
            conversationMemory,
            userMemory,
            conversations,
            convId: activeId,
            personalityId,
            draft: debouncedDraft,
            ideSnapshot:
              primaryView === 'finances'
                ? null
                : getIdeTurnHost()?.getSnapshot() ?? null,
          })
        : null,
    [
      workbenchMode,
      primaryView,
      messages,
      conversationMemory,
      userMemory,
      conversations,
      activeId,
      personalityId,
      debouncedDraft,
    ],
  )

  return (
    <StatusBar
      workbenchMode={workbenchMode}
      primaryView={primaryView}
      serverOk={serverOk}
      serverChecking={serverChecking}
      contextUsage={contextUsage}
      onOpenLunarAccount={onOpenLunarAccount}
      onOpenBilling={onOpenBilling}
      modelCatalog={financesAgentMode ? modelCatalog : undefined}
      selectedModelId={financesAgentMode ? selectedModelId : undefined}
      fixedModelLabel={fixedModelLabel}
    />
  )
}

export const ChatStatusBar = memo(ChatStatusBarInner)
