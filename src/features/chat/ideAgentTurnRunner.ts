import { runAgentTurn } from '../../agent'
import { getToolUiLabels } from '../../agent/toolSchemas'
import { messagesAfterSummaryBoundary } from '../../lib/lunaMemory'
import { isAssistantErrorText } from '../../lib/assistantMessageUi'
import { readStreamingEnabled } from '../../lib/llmStreamClient'
import { fetchServerDiagnosticLogs } from '../../lib/lunaDiagnostics'
import { setIdeAgentProgress } from '../../lib/ideAgentProgress'
import { flushConversationPatch } from '../../lib/streamingUiPatch'
import {
  AgentTurnAbortedError,
  beginAgentTurn,
  endAgentTurn,
} from '../../lib/agentTurnCancel'
import { registerLunaIdeTools } from '../../plugins/luna-ide/tools'
import type { ChatPersonalityId } from '../../lib/chatPersonality'
import type { LlmSelection } from '../../lib/togetherClient'
import type { Conversation, Message } from '../../types/chat'
import type { UserMemoryState } from '../../types/memory'
import type { IdeAttachedContext } from '../../lib/ideMentions'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { nextId } from '../chat/state/conversationPersistence'
import {
  patchAssistantMessage,
  upsertReasoningSegment,
} from './lib/messagePatch'

export type IdeAgentTurnRunnerInput = {
  convId: string
  assistantMsgId: string
  userMsg: Message
  conversations: Conversation[]
  messages: Message[]
  personalityId: ChatPersonalityId
  ragEnabled: boolean
  reasoningEnabled: boolean
  llmSelection: LlmSelection | undefined
  ideContextBlock: string
  ideMentions: IdeAttachedContext[]
  userMemoryRef: MutableRefObject<UserMemoryState>
  setUserMemory: Dispatch<SetStateAction<UserMemoryState>>
  updateConversation: (
    conversationId: string,
    updater: (c: Conversation) => Conversation | null | undefined,
  ) => void
}

export async function runIdeAgentTurnRunner(
  input: IdeAgentTurnRunnerInput,
): Promise<void> {
  registerLunaIdeTools()

  const {
    convId,
    assistantMsgId,
    userMsg,
    conversations,
    messages,
    personalityId,
    ragEnabled,
    reasoningEnabled,
    llmSelection,
    ideContextBlock,
    ideMentions,
    userMemoryRef,
    setUserMemory,
    updateConversation,
  } = input

  const convSnapshot = conversations.find((c) => c.id === convId)
  if (!convSnapshot) return

  const memoryWorking = convSnapshot.memory
    ? { ...convSnapshot.memory }
    : undefined
  const verbatimWorking = messagesAfterSummaryBoundary(
    messages,
    memoryWorking?.summarizedThroughMessageId,
  )

  const toolStatusLabel = (name: string) => {
    const base = getToolUiLabels()[name] ?? name
    return `A usar ${base.toLowerCase()}…`
  }

  patchAssistantMessage(convId, assistantMsgId, updateConversation, (m) => ({
    ...m,
    text: '',
    streamingActive: undefined,
    turnStatusHint: 'A preparar ferramentas do agente…',
    llmProvider: llmSelection?.provider,
  }))

  const turnSignal = beginAgentTurn()
  let agentResult: Awaited<ReturnType<typeof runAgentTurn>>
  try {
    agentResult = await runAgentTurn(
      {
        signal: turnSignal,
        convId,
        assistantMsgId,
        userMsg,
        verbatimWorking,
        memoryWorking,
        conversations,
        userMemory: userMemoryRef.current,
        ragEnabled,
        personalityId,
        imageAttachments: [],
        userCaption: userMsg.text,
        getMemoryNotes: () => userMemoryRef.current.memoryNotes ?? [],
        setMemoryNotes: (notes) => {
          setUserMemory((prev) => ({
            ...prev,
            memoryNotes: notes,
            updatedAt: Date.now(),
          }))
        },
        setMemoryUi: (memoryUi) => {
          setUserMemory((prev) => ({
            ...prev,
            memoryUi,
            updatedAt: Date.now(),
          }))
        },
        workbenchMode: 'ide',
        primaryView: undefined,
        ideContextBlock,
        financesContextBlock: '',
        financesAddonActive: false,
        ideMentions,
        convIdForCheckpoints: convId,
        nextId,
        onToolStart: (toolName) => {
          patchAssistantMessage(convId, assistantMsgId, updateConversation, (m) => ({
            ...m,
            turnStatusHint: toolStatusLabel(toolName),
            agentStepsInProgress: m.agentStepsInProgress ?? [],
          }))
        },
        onStatusHint: (hint) => {
          patchAssistantMessage(convId, assistantMsgId, updateConversation, (m) => ({
            ...m,
            turnStatusHint: hint,
          }))
        },
        onOrchestratorRound: (round, phase) => {
          setIdeAgentProgress({ round, phase })
          updateConversation(convId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMsgId
                ? { ...m, orchestratorRound: round, agentPhase: phase }
                : m,
            ),
            updatedAt: Date.now(),
          }))
        },
        onToolComplete: (step) => {
          updateConversation(convId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    agentSteps: [...(m.agentSteps ?? []), step],
                    agentStepsInProgress: undefined,
                  }
                : m,
            ),
            updatedAt: Date.now(),
          }))
        },
        onPrepareSynthesis: () => {
          flushConversationPatch(updateConversation, convId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id !== assistantMsgId
                ? m
                : {
                    ...m,
                    text: '',
                    turnStatusHint: undefined,
                    streamingActive: true,
                    reasoningInProgress: false,
                    reasoningStreamingActive: false,
                    agentStepsInProgress: undefined,
                  },
            ),
            updatedAt: Date.now(),
          }))
        },
        onAssistantDelta: (text) => {
          flushConversationPatch(updateConversation, convId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id !== assistantMsgId
                ? m
                : {
                    ...m,
                    text,
                    turnStatusHint: undefined,
                    streamingActive: true,
                    reasoningInProgress: false,
                    reasoningStreamingActive: false,
                  },
            ),
            updatedAt: Date.now(),
          }))
        },
        onReasoningSegmentDelta: (round, text) => {
          flushConversationPatch(updateConversation, convId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id !== assistantMsgId
                ? m
                : {
                    ...m,
                    turnStatusHint: undefined,
                    reasoningInProgress: true,
                    reasoningStreamingActive: true,
                    reasoningSegments: upsertReasoningSegment(m.reasoningSegments, {
                      round,
                      text,
                      inProgress: true,
                    }),
                    reasoningTrace: {
                      text,
                      provider: llmSelection?.provider ?? 'ollama',
                    },
                  },
            ),
            updatedAt: Date.now(),
          }))
        },
        onReasoningSegmentComplete: (round, text) => {
          const raw = text.trim()
          patchAssistantMessage(convId, assistantMsgId, updateConversation, (m) => ({
            ...m,
            reasoningInProgress: false,
            reasoningStreamingActive: false,
            reasoningSegments: upsertReasoningSegment(m.reasoningSegments, {
              round,
              text: raw,
              inProgress: false,
              translating: false,
            }),
            ...(raw
              ? {
                  reasoningTrace: {
                    text: raw,
                    provider: llmSelection?.provider ?? 'ollama',
                  },
                }
              : {}),
          }))
        },
        onToolsPending: () => {
          patchAssistantMessage(convId, assistantMsgId, updateConversation, (m) => ({
            ...m,
            text: '',
            turnStatusHint: 'A preparar ferramentas…',
            streamingActive: undefined,
            reasoningStreamingActive: false,
          }))
        },
        reasoningEnabled,
        streamingEnabled: readStreamingEnabled(),
        llmSelection,
      },
      memoryWorking?.rollingSummary ?? '',
    )
  } catch (err) {
    if (err instanceof AgentTurnAbortedError) {
      agentResult = {
        assistantText: 'Geração interrompida.',
        agentSteps: [],
        cancelled: true,
      }
    } else {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro inesperado ao processar o turno.'
      agentResult = {
        assistantText: msg,
        agentSteps: [],
      }
    }
  } finally {
    endAgentTurn()
    setIdeAgentProgress(null)
  }

  let turnDiagnostics = agentResult.turnDiagnostics
  if (isAssistantErrorText(agentResult.assistantText)) {
    const logs = await fetchServerDiagnosticLogs(150)
    turnDiagnostics = {
      ...turnDiagnostics,
      serverLog: logs.ok ? logs.text : logs.error,
      capturedAt: Date.now(),
    }
  }

  updateConversation(convId, (c) => ({
    ...c,
    messages: c.messages.map((m) =>
      m.id === assistantMsgId
        ? {
            ...m,
            text: agentResult.assistantText,
            turnDiagnostics,
            ragCitations: agentResult.ragCitations,
            memoryBadge: agentResult.memoryBadge,
            memoryNoteIds: agentResult.memoryNoteIds,
            memorySavedPreview: agentResult.memorySavedPreview,
            agentSteps:
              agentResult.agentSteps.length > 0
                ? agentResult.agentSteps
                : m.agentSteps,
            agentStepsInProgress: undefined,
            reasoningTrace: agentResult.reasoningTrace ?? m.reasoningTrace,
            reasoningInProgress: undefined,
            orchestratorRound: undefined,
            agentPhase: undefined,
            reasoningStreamingActive: undefined,
            reasoningTranslating: undefined,
            streamingActive: undefined,
            turnStatusHint: undefined,
            llmProvider: llmSelection?.provider ?? m.llmProvider,
          }
        : m,
    ),
    updatedAt: Date.now(),
  }))
}
