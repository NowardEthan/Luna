import { buildAgentFinalSystem, buildSystemCore } from '../agent/buildAgentSystemPrompt'
import type { ChatPersonalityId } from './chatPersonality'
import {
  DEFAULT_CONTEXT_WINDOW_TOKENS,
  estimateTokens,
  estimateTotalPromptTokens,
  messagesAfterSummaryBoundary,
  userContentForLlm,
} from './lunaMemory'
import type { WorkspaceSnapshot } from './ideTurnHost'
import type { Conversation, Message } from '../types/chat'
import type { ConversationMemory, UserMemoryState } from '../types/memory'
import type { LunaPrimaryView } from './primaryView'
import type { LunaWorkbenchMode } from './workbenchMode'
import { compileFinancesContextBlock } from './financesContextCompiler'
import { ideContextLimits } from './ideContextConfig'

export type ContextUsageSegment = {
  id: string
  label: string
  tokens: number
}

export type ContextUsageSnapshot = {
  totalTokens: number
  limitTokens: number
  percent: number
  compacted: boolean
  segments: ContextUsageSegment[]
}

export function estimateIdeContextTokens(snapshot: WorkspaceSnapshot | null): number {
  if (!snapshot?.workspaceRoot) return 0
  const limits = ideContextLimits()
  let chars = 1200
  for (const f of snapshot.openFiles) {
    chars += Math.min(f.content.length, limits.dirtyTabMaxChars)
  }
  chars += snapshot.pendingPatches.length * 400
  chars += snapshot.terminalLines.slice(-40).reduce((n, l) => n + l.text.length, 0)
  return estimateTokens('x'.repeat(Math.min(chars, limits.totalMaxChars)))
}

export function buildContextUsageSnapshot(input: {
  workbenchMode: LunaWorkbenchMode
  primaryView?: LunaPrimaryView
  messages: Message[]
  conversationMemory?: ConversationMemory
  userMemory: UserMemoryState
  conversations: Conversation[]
  convId: string
  personalityId: ChatPersonalityId
  draft: string
  ideSnapshot?: WorkspaceSnapshot | null
}): ContextUsageSnapshot {
  const financesView = input.primaryView === 'finances'
  const limitTokens = DEFAULT_CONTEXT_WINDOW_TOKENS
  const verbatim = messagesAfterSummaryBoundary(
    input.messages,
    input.conversationMemory?.summarizedThroughMessageId,
  )
  const rolling = input.conversationMemory?.rollingSummary?.trim() ?? ''
  const ideTokens =
    input.workbenchMode === 'ide' && !financesView
      ? estimateIdeContextTokens(input.ideSnapshot ?? null)
      : 0
  const financesTokens = financesView
    ? estimateTokens(compileFinancesContextBlock())
    : 0

  const systemCore = buildSystemCore(
    input.personalityId,
    input.workbenchMode,
    undefined,
    financesView ? compileFinancesContextBlock() : undefined,
    financesView,
    input.primaryView ?? 'conversation',
  )
  const fullSystem = buildAgentFinalSystem(
    systemCore,
    input.userMemory,
    input.conversations,
    input.convId,
    rolling,
  )

  const systemTokens = estimateTokens(fullSystem) + ideTokens + financesTokens
  const historyTokens = verbatim.reduce(
    (n, m) => n + estimateTokens(userContentForLlm(m)),
    0,
  )
  const draftTokens = estimateTokens(input.draft.trim())
  const summaryTokens = rolling ? estimateTokens(rolling) : 0

  const totalTokens = estimateTotalPromptTokens(
    fullSystem,
    verbatim,
    input.draft.trim() || '(próxima mensagem)',
  ) + ideTokens

  const segments: ContextUsageSegment[] = [
    { id: 'system', label: 'Instruções e memória', tokens: systemTokens },
  ]
  if (summaryTokens) {
    segments.push({
      id: 'summary',
      label: 'Resumo da conversa',
      tokens: summaryTokens,
    })
  }
  if (historyTokens) {
    segments.push({
      id: 'history',
      label: 'Mensagens recentes',
      tokens: historyTokens,
    })
  }
  if (ideTokens) {
    segments.push({
      id: 'ide',
      label: 'Contexto IDE (ficheiros, terminal)',
      tokens: ideTokens,
    })
  }
  if (draftTokens) {
    segments.push({
      id: 'draft',
      label: 'Rascunho actual',
      tokens: draftTokens,
    })
  }

  const percent = Math.min(100, Math.round((totalTokens / limitTokens) * 100))

  return {
    totalTokens,
    limitTokens,
    percent,
    compacted: Boolean(input.conversationMemory?.summarizedThroughMessageId),
    segments,
  }
}
