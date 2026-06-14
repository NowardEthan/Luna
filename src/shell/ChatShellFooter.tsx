import { memo } from 'react'
import type { KeyboardEvent } from 'react'
import type { AssistantTurnPhase } from '../lib/assistantMessageUi'
import { LunarCloudBanner } from '../components/lunar/LunarCloudBanner'
import { ChatStatusBar } from '../components/chat/ChatStatusBar'
import { PendingChangesPanel } from '../components/ide/PendingChangesPanel'
import { SimpleChatComposer } from '../features/chat/SimpleChatComposer'
import type { Conversation } from '../types/chat'
import type { Message } from '../types/chat'
import type { UserMemoryState } from '../types/memory'
import type { LunaModelOption } from '../lib/llmModelSelection'
import type { LunaPrimaryView } from '../lib/primaryView'
import type { LunaWorkbenchMode } from '../lib/workbenchMode'
import type { ChatPersonalityId } from '../lib/chatPersonality'

type Props = {
  showPendingChanges: boolean
  onSend: () => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void
  composerBusy: boolean
  workingLabel?: string
  workingPhase?: AssistantTurnPhase
  onStop?: () => void
  reasoningEnabled: boolean
  onReasoningChange: (enabled: boolean) => void
  modelLabel?: string
  reasoningUnsupportedMsg?: string
  workbenchMode: LunaWorkbenchMode
  primaryView: LunaPrimaryView
  serverOk: boolean | null
  serverChecking?: boolean
  activeId: string | null
  messages: Message[]
  conversations: Conversation[]
  conversationMemory?: Conversation['memory']
  userMemory: UserMemoryState
  personalityId: ChatPersonalityId
  financesAgentMode: boolean
  modelCatalog?: LunaModelOption[]
  selectedModelId?: string | null
  fixedModelLabel?: string
  onOpenLunarAccount?: () => void
  onOpenBilling?: () => void
  usageQuotaAlert?: string | null
  usageQuotaAlertLevel?: 'warn70' | 'warn90' | 'atLimit'
}

function ChatShellFooterInner({
  showPendingChanges,
  onSend,
  onKeyDown,
  composerBusy,
  workingLabel,
  workingPhase,
  onStop,
  reasoningEnabled,
  onReasoningChange,
  modelLabel,
  reasoningUnsupportedMsg,
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
  usageQuotaAlert,
  usageQuotaAlertLevel,
}: Props) {
  return (
    <>
      {showPendingChanges ? <PendingChangesPanel variant="chat" /> : null}
      <LunarCloudBanner />
      <SimpleChatComposer
        onSend={onSend}
        onKeyDown={onKeyDown}
        busy={composerBusy}
        workingLabel={workingLabel}
        workingPhase={workingPhase}
        onStop={onStop}
        reasoningEnabled={reasoningEnabled}
        onReasoningChange={onReasoningChange}
        modelLabel={modelLabel}
        reasoningUnsupportedMsg={reasoningUnsupportedMsg}
        ideComposer={workbenchMode === 'ide'}
        usageQuotaAlert={usageQuotaAlert}
        usageQuotaAlertLevel={usageQuotaAlertLevel}
        onOpenBilling={onOpenBilling}
      />
      <ChatStatusBar
        workbenchMode={workbenchMode}
        primaryView={primaryView}
        serverOk={serverOk}
        serverChecking={serverChecking}
        activeId={activeId}
        messages={messages}
        conversations={conversations}
        conversationMemory={conversationMemory}
        userMemory={userMemory}
        personalityId={personalityId}
        financesAgentMode={financesAgentMode}
        modelCatalog={modelCatalog}
        selectedModelId={selectedModelId}
        fixedModelLabel={fixedModelLabel}
        onOpenLunarAccount={onOpenLunarAccount}
        onOpenBilling={onOpenBilling}
      />
    </>
  )
}

export const ChatShellFooter = memo(ChatShellFooterInner)
