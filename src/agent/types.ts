import type { ChatPersonalityId } from '../lib/chatPersonality'
import type { LlmSelection } from '../lib/togetherClient'
import type {
  AgentStepRecord,
  Conversation,
  Message,
  RagCitation,
  ReasoningTrace,
} from '../types/chat'
import type { LunaWorkbenchMode } from '../lib/workbenchMode'
import type { IdeAttachedContext } from '../lib/ideMentions'
import type { ConversationMemory, UserMemoryState } from '../types/memory'

export type ImageAttachment = { name: string; dataUrl: string }

/** @deprecated use AgentStepRecord from types/chat */
export type AgentStep = AgentStepRecord

export type AgentTurnInput = {
  convId: string
  assistantMsgId: string
  userMsg: Message
  verbatimWorking: Message[]
  memoryWorking: ConversationMemory | undefined
  conversations: Conversation[]
  userMemory: UserMemoryState
  ragEnabled: boolean
  personalityId: ChatPersonalityId
  imageAttachments: ImageAttachment[]
  userCaption: string
  getMemoryNotes: () => UserMemoryState['memoryNotes']
  setMemoryNotes: (notes: NonNullable<UserMemoryState['memoryNotes']>) => void
  setMemoryUi: (ui: UserMemoryState['memoryUi']) => void
  nextId: () => string
  onToolStart?: (toolName: string) => void
  onToolComplete?: (step: AgentStepRecord) => void
  onStatusHint?: (hint: string) => void
  onOrchestratorRound?: (round: number, phase: string) => void
  /** Pensamento em streaming para a ronda actual. */
  onReasoningSegmentDelta?: (round: number, text: string) => void
  /** Ronda terminou — segmento fechado. */
  onReasoningSegmentComplete?: (round: number, text: string) => void
  onAssistantDelta?: (fullText: string) => void
  /** Indicador «a pensar» — sem texto até o passo LLM terminar */
  onReasoningStarted?: () => void
  onReasoningDisplayUpdate?: (trace: Pick<
    ReasoningTrace,
    'text' | 'textOriginal' | 'translated' | 'locale'
  >) => void
  onReasoningTranslating?: (translating: boolean) => void
  onToolsPending?: () => void
  /** Após pesquisa/tools — UI deixa de mostrar «a pensar» e espera texto final */
  onPrepareSynthesis?: () => void
  reasoningEnabled?: boolean
  streamingEnabled?: boolean
  usePlanning?: boolean
  llmSelection?: LlmSelection
  workbenchMode?: LunaWorkbenchMode
  ideContextBlock?: string
  ideMentions?: IdeAttachedContext[]
  convIdForCheckpoints?: string
}

export type AgentTurnResult = {
  assistantText: string
  memoryBadge?: Message['memoryBadge']
  memoryNoteIds?: string[]
  memorySavedPreview?: string
  ragCitations?: RagCitation[]
  agentSteps: AgentStepRecord[]
  reasoningTrace?: ReasoningTrace
  llmProvider?: import('../types/chat').LlmProviderId
  usedLlmFallback?: boolean
  /** Preenchido se describe_images corre neste turno */
  visionDescription?: string
  turnDiagnostics?: import('../types/chat').TurnDiagnostics
}

export type ToolExecuteResult = {
  content: string
  stepSummary: string
  ok: boolean
  step: AgentStepRecord
}
