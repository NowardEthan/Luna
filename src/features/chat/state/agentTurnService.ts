import { useCallback } from 'react'
import { buildAgentFinalSystem, buildSystemCore, runAgentTurn } from '../../../agent'
import { getToolUiLabels } from '../../../agent/toolSchemas'
import {
  COMPACTION_SYSTEM_PROMPT,
  COMPACTION_THRESHOLD_RATIO,
  DEFAULT_CONTEXT_WINDOW_TOKENS,
  dialogueTextForCompaction,
  estimateTotalPromptTokens,
  memoryFromCompactionModel,
  messagesAfterSummaryBoundary,
  selectCompactionChunk,
  userContentForLlm,
} from '../../../lib/lunaMemory'
import {
  insertTurnMessages,
  patchMemoryAfterRegenerate,
  resolveRegenerateTurn,
} from '../../../lib/regenerateTurn'
import { setIdeAgentProgress } from '../../../lib/ideAgentProgress'
import { localizeReasoningSegmentText } from '../../../lib/reasoningSegmentLocalize'
import { fetchServerDiagnosticLogs } from '../../../lib/lunaDiagnostics'
import { isAssistantErrorText } from '../../../lib/assistantMessageUi'
import { readStreamingEnabled } from '../../../lib/llmStreamClient'
import { readWorkbenchMode } from '../../../lib/workbenchMode'
import { compileIdeContextBlock } from '../../../lib/ideContextCompiler'
import { parseIdeMentions } from '../../../lib/ideMentions'
import { getIdeTurnHost } from '../../../lib/ideTurnHost'
import { completeLlmChat, splitDataUrl, visionDescribeImages } from '../../../lib/togetherClient'
import type { ChatPersonalityId } from '../../../lib/chatPersonality'
import type { LlmSelection } from '../../../lib/togetherClient'
import type { Conversation, Message } from '../../../types/chat'
import type { ConversationMemory, UserMemoryState } from '../../../types/memory'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { deriveTitle, nextId } from './conversationPersistence'
import { patchAssistantMessage, upsertReasoningSegment } from '../lib/messagePatch'
import {
  AgentTurnAbortedError,
  beginAgentTurn,
  cancelActiveAgentTurn,
  endAgentTurn,
} from '../../../lib/agentTurnCancel'
import { blockCloudLlmIfNeeded } from '../../../lib/lunarGate'

const IMG_PLACEHOLDER = '(imagem anexada)'

export type SendMessageOptions = {
  regenerateFromMessageId?: string
}

export type AgentTurnDeps = {
  activeId: string
  conversations: Conversation[]
  messages: Message[]
  personalityId: ChatPersonalityId
  ragEnabled: boolean
  reasoningEnabled: boolean
  llmSelection: LlmSelection | undefined
  updateConversation: (
    conversationId: string,
    updater: (c: Conversation) => Conversation | null | undefined,
  ) => void
  userMemoryRef: MutableRefObject<UserMemoryState>
  setUserMemory: Dispatch<SetStateAction<UserMemoryState>>
}

export function useAgentTurnService(deps: AgentTurnDeps) {
  const {
    activeId,
    conversations,
    messages,
    personalityId,
    ragEnabled,
    reasoningEnabled,
    llmSelection,
    updateConversation,
    userMemoryRef,
    setUserMemory,
  } = deps
  const sendMessage = useCallback(
    async (
      userText: string,
      imageAttachments?: { name: string; dataUrl: string }[],
      options?: SendMessageOptions,
    ) => {
      const convId = activeId
      if (!convId) return

      const regenerateId = options?.regenerateFromMessageId?.trim()
      const resolvedRedo = regenerateId
        ? resolveRegenerateTurn(
            conversations.find((c) => c.id === convId)?.messages ?? [],
            regenerateId,
          )
        : null

      if (regenerateId && !resolvedRedo) return

      if (resolvedRedo) {
        const removedAssistants = new Set(resolvedRedo.removedAssistantIds)
        setUserMemory((prev) => ({
          ...prev,
          memoryNotes: (prev.memoryNotes ?? []).filter(
            (n) =>
              !n.sourceMessageId || !removedAssistants.has(n.sourceMessageId),
          ),
          updatedAt: Date.now(),
        }))
      }

      let trimmed = userText.replace(/\s+/g, ' ').trim()
      let imgs = imageAttachments?.slice(0, 5) ?? []

      if (resolvedRedo) {
        trimmed = resolvedRedo.userText.replace(/\s+/g, ' ').trim()
        imgs =
          resolvedRedo.imageAttachments?.map((im) => ({
            name: im.name,
            dataUrl: im.dataUrl,
          })) ?? []
      }

      if (!resolvedRedo && !trimmed.length && !imgs.length) return

      if (
        blockCloudLlmIfNeeded(
          llmSelection?.provider,
          'Inicie sessão com a Conta Lunar para enviar mensagens com este modelo.',
        )
      ) {
        return
      }

      if (
        !resolvedRedo &&
        imgs.length &&
        blockCloudLlmIfNeeded(
          'openrouter',
          'Imagens no chat exigem Conta Lunar (modelos multimodais na nuvem).',
        )
      ) {
        return
      }

      if (!resolvedRedo && imgs.length) {
        const parsed = imgs
          .map((im) => splitDataUrl(im.dataUrl))
          .filter((x): x is { mime: string; dataBase64: string } => x != null)
        if (!parsed.length) {
          updateConversation(convId, (c) => ({
            ...c,
            messages: [
              ...c.messages,
              {
                id: nextId(),
                role: 'assistant',
                text:
                  'NÃ£o foi possÃ­vel ler as imagens (formato invÃ¡lido). Tente outro arquivo ou captura de tela.',
              },
            ],
            updatedAt: Date.now(),
          }))
          return
        }
      }

      let visionDescription: string | undefined
      if (resolvedRedo?.visionDescription?.trim()) {
        visionDescription = resolvedRedo.visionDescription.trim()
      }

      const displayText = trimmed.length ? trimmed : IMG_PLACEHOLDER
      const storedImages =
        imgs.length > 0
          ? imgs.map((im, idx) => ({
              id: `img-${Date.now()}-${idx}`,
              name: im.name,
              dataUrl: im.dataUrl,
            }))
          : undefined

      const workbenchMode = readWorkbenchMode()
      const ideMentions =
        workbenchMode === 'ide' ? parseIdeMentions(trimmed) : []

      const userMsg: Message = {
        id: nextId(),
        role: 'user',
        text: displayText,
        visionDescription,
        imageAttachments: storedImages,
        ideContexts: ideMentions.length ? ideMentions : undefined,
      }
      const assistantMsgId = nextId()

      let ideContextBlock = ''
      if (workbenchMode === 'ide') {
        const host = getIdeTurnHost()
        if (host) {
          ideContextBlock = await compileIdeContextBlock({
            snapshot: host.getSnapshot(),
            mentions: ideMentions,
            userQuery: trimmed,
            ragEnabled,
          })
        }
      }

      const systemCore = buildSystemCore(
        personalityId,
        workbenchMode,
        ideContextBlock,
      )

      const convSnapshot = conversations.find((c) => c.id === convId)
      if (!convSnapshot) return

      const removedForMemory =
        resolvedRedo != null
          ? new Set(resolvedRedo.removedMessageIds)
          : null

      let memoryWorking: ConversationMemory | undefined
      let verbatimWorking: Message[]

      if (resolvedRedo && removedForMemory) {
        const patched = patchMemoryAfterRegenerate(
          convSnapshot.memory,
          removedForMemory,
          resolvedRedo.insertAt,
          convSnapshot.messages,
        )
        memoryWorking = patched
          ? { ...patched }
          : convSnapshot.memory
            ? { ...convSnapshot.memory }
            : undefined
        verbatimWorking = messagesAfterSummaryBoundary(
          resolvedRedo.historyWithoutTurn,
          memoryWorking?.summarizedThroughMessageId,
        )
      } else {
        memoryWorking = convSnapshot.memory
          ? { ...convSnapshot.memory }
          : undefined
        verbatimWorking = messagesAfterSummaryBoundary(
          messages,
          memoryWorking?.summarizedThroughMessageId,
        )
      }

      const threshold = Math.floor(
        DEFAULT_CONTEXT_WINDOW_TOKENS * COMPACTION_THRESHOLD_RATIO,
      )
      const pendingContent = userContentForLlm(userMsg)

      // Compactacao: so mensagens deste chat (verbatim); RAG/recall ficam nas tools do agente.
      let guard = 0
      while (guard++ < 12) {
        const fullSys = buildAgentFinalSystem(
          systemCore,
          userMemoryRef.current,
          conversations,
          convId,
          memoryWorking?.rollingSummary ?? '',
        )
        const est = estimateTotalPromptTokens(
          fullSys,
          verbatimWorking,
          pendingContent,
        )
        if (est <= threshold) break
        const sel = selectCompactionChunk(verbatimWorking)
        if (!sel) break
        const dialogue = dialogueTextForCompaction(sel.chunk)
        const prevRoll = memoryWorking?.rollingSummary?.trim() ?? ''
        const compactionRes = await completeLlmChat(
          [
            { role: 'system', content: COMPACTION_SYSTEM_PROMPT },
            {
              role: 'user',
              content:
                'Lembrete: o resumo deve privilegiar o que a pessoa (UsuÃ¡rio) disse; falas da Luna podem ser bem enxutas salvo fatos essenciais.\n\n' +
                `Resumo anterior desta conversa (sÃ³ diÃ¡logo, pode estar vazio):\n${prevRoll}\n\nTrecho do diÃ¡logo a integrar:\n\n${dialogue}`,
            },
          ],
          {
            maxCompletionTokens: 2048,
            temperature: 0.25,
            reasoningEnabled: false,
            llmSelection,
          },
        )
        if (!compactionRes.ok) break
        const boundaryId = sel.chunk[sel.chunk.length - 1].id
        memoryWorking = memoryFromCompactionModel(
          compactionRes.text,
          boundaryId,
        )
        verbatimWorking = sel.rest
      }

      const memoryToPersist = memoryWorking ?? convSnapshot.memory

      updateConversation(convId, (c) => {
        const msgs: Message[] =
          resolvedRedo != null
            ? insertTurnMessages(
                resolvedRedo.historyWithoutTurn,
                resolvedRedo.insertAt,
                userMsg,
                assistantMsgId,
                {
                  reasoningInProgress: false,
                },
              )
            : [
                ...c.messages,
                userMsg,
                {
                  id: assistantMsgId,
                  role: 'assistant',
                  text: 'Pensandoâ€¦',
                  reasoningInProgress: false,
                },
              ]
        return {
          ...c,
          messages: msgs,
          memory: memoryToPersist,
          title: c.titlePinned ? c.title : deriveTitle(msgs),
          updatedAt: Date.now(),
        }
      })

      let visionForTurn = visionDescription
      if (!visionForTurn && imgs.length > 0) {
        const parsed = imgs
          .map((im) => splitDataUrl(im.dataUrl))
          .filter((x): x is { mime: string; dataBase64: string } => x != null)
        if (parsed.length) {
          updateConversation(convId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMsgId
                ? { ...m, text: 'A analisar imagemâ€¦' }
                : m,
            ),
            updatedAt: Date.now(),
          }))
          const vr = await visionDescribeImages({
            images: parsed,
            userCaption: trimmed,
          })
          if (vr.ok && vr.text.trim()) {
            visionForTurn = vr.text.trim()
            userMsg.visionDescription = visionForTurn
            updateConversation(convId, (c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === userMsg.id
                  ? { ...m, visionDescription: visionForTurn }
                  : m.id === assistantMsgId
                    ? { ...m, text: 'Pensandoâ€¦' }
                    : m,
              ),
              updatedAt: Date.now(),
            }))
          } else {
            updateConversation(convId, (c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, text: 'Pensandoâ€¦' } : m,
              ),
              updatedAt: Date.now(),
            }))
          }
        }
      }

      const toolStatusLabel = (name: string) => {
        const base = getToolUiLabels()[name] ?? name
        return `A usar ${base.toLowerCase()}â€¦`
      }

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
          imageAttachments: imgs,
          userCaption: trimmed,
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
          workbenchMode,
          ideContextBlock,
          ideMentions,
          convIdForCheckpoints: convId,
          nextId,
          onToolStart: (toolName) => {
            updateConversation(convId, (c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      text: toolStatusLabel(toolName),
                      agentStepsInProgress: m.agentStepsInProgress ?? [],
                    }
                  : m,
              ),
              updatedAt: Date.now(),
            }))
          },
          onStatusHint: (hint) => {
            updateConversation(convId, (c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, text: hint } : m,
              ),
              updatedAt: Date.now(),
            }))
          },
          onOrchestratorRound: (round, phase) => {
            if (workbenchMode === 'ide') {
              setIdeAgentProgress({ round, phase })
            }
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
          onReasoningSegmentDelta: (round, text) => {
            patchAssistantMessage(
              convId,
              assistantMsgId,
              updateConversation,
              (m) => ({
                ...m,
                reasoningInProgress: true,
                reasoningSegments: upsertReasoningSegment(m.reasoningSegments, {
                  round,
                  text,
                  inProgress: true,
                }),
                reasoningTrace: {
                  text,
                  provider: llmSelection?.provider ?? 'ollama',
                },
              }),
            )
          },
          onReasoningSegmentComplete: (round, text) => {
            const raw = text.trim()
            patchAssistantMessage(
              convId,
              assistantMsgId,
              updateConversation,
              (m) => ({
                ...m,
                reasoningInProgress: false,
                reasoningSegments: upsertReasoningSegment(m.reasoningSegments, {
                  round,
                  text: raw,
                  inProgress: false,
                  translating: raw.length > 0,
                }),
              }),
            )
            if (!raw) return
            void (async () => {
              try {
                const localized = await localizeReasoningSegmentText(raw)
                patchAssistantMessage(
                  convId,
                  assistantMsgId,
                  updateConversation,
                  (m) => ({
                    ...m,
                    reasoningSegments: upsertReasoningSegment(
                      m.reasoningSegments,
                      {
                        round,
                        ...localized,
                        inProgress: false,
                        translating: false,
                      },
                    ),
                    reasoningTrace: {
                      text: localized.text,
                      provider: llmSelection?.provider ?? 'ollama',
                      ...(localized.textOriginal
                        ? {
                            textOriginal: localized.textOriginal,
                            translated: true,
                          }
                        : {}),
                      ...(localized.locale ? { locale: localized.locale } : {}),
                    },
                  }),
                )
              } catch {
                patchAssistantMessage(
                  convId,
                  assistantMsgId,
                  updateConversation,
                  (m) => ({
                    ...m,
                    reasoningSegments: upsertReasoningSegment(
                      m.reasoningSegments,
                      {
                        round,
                        text: raw,
                        inProgress: false,
                        translating: false,
                      },
                    ),
                  }),
                )
              }
            })()
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
            updateConversation(convId, (c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      text: 'A escrever respostaâ€¦',
                      reasoningInProgress: false,
                      reasoningStreamingActive: false,
                      agentStepsInProgress: undefined,
                    }
                  : m,
              ),
              updatedAt: Date.now(),
            }))
          },
          onAssistantDelta: (text) => {
            updateConversation(convId, (c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      text,
                      streamingActive: true,
                      reasoningInProgress: false,
                      reasoningStreamingActive: false,
                    }
                  : m,
              ),
              updatedAt: Date.now(),
            }))
          },
          onReasoningStarted: () => {
            updateConversation(convId, (c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      reasoningInProgress: true,
                      reasoningStreamingActive: false,
                    }
                  : m,
              ),
              updatedAt: Date.now(),
            }))
          },
          onReasoningDisplayUpdate: (patch) => {
            updateConversation(convId, (c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      reasoningInProgress: false,
                      reasoningStreamingActive: false,
                      reasoningTrace: {
                        text: patch.text,
                        provider: llmSelection?.provider ?? 'ollama',
                        ...(patch.textOriginal
                          ? { textOriginal: patch.textOriginal, translated: true }
                          : patch.translated
                            ? { translated: true }
                            : {}),
                        ...(patch.locale ? { locale: patch.locale } : {}),
                      },
                    }
                  : m,
              ),
              updatedAt: Date.now(),
            }))
          },
          onReasoningTranslating: (translating) => {
            updateConversation(convId, (c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, reasoningTranslating: translating }
                  : m,
              ),
              updatedAt: Date.now(),
            }))
          },
          onToolsPending: () => {
            updateConversation(convId, (c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      text: 'A preparar ferramentasâ€¦',
                      streamingActive: undefined,
                      reasoningInProgress: undefined,
                    }
                  : m,
              ),
              updatedAt: Date.now(),
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
      }

      let turnDiagnostics = agentResult.turnDiagnostics
      if (isAssistantErrorText(agentResult.assistantText)) {
        const logs = await fetchServerDiagnosticLogs(150)
        turnDiagnostics = {
          ...turnDiagnostics,
          llmAttempts: turnDiagnostics?.llmAttempts,
          serverLog: logs.ok ? logs.text : logs.error,
          capturedAt: Date.now(),
        }
      }

      updateConversation(convId, (c) => {
        const nextMsgs = c.messages.map((m) =>
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
                    : undefined,
                agentStepsInProgress: undefined,
                reasoningTrace: agentResult.reasoningTrace,
                reasoningSegments: m.reasoningSegments?.length
                  ? m.reasoningSegments.map((s) => ({
                      round: s.round,
                      text: s.text,
                      ...(s.textOriginal
                        ? { textOriginal: s.textOriginal, translated: true }
                        : s.translated
                          ? { translated: true }
                          : {}),
                      ...(s.locale ? { locale: s.locale } : {}),
                    }))
                  : undefined,
                reasoningInProgress: undefined,
                orchestratorRound: undefined,
                agentPhase: undefined,
                reasoningStreamingActive: undefined,
                reasoningTranslating: undefined,
                streamingActive: undefined,
                llmProvider: agentResult.llmProvider,
                usedLlmFallback: agentResult.usedLlmFallback || undefined,
              }
            : m.id === userMsg.id && agentResult.visionDescription
              ? {
                  ...m,
                  visionDescription: agentResult.visionDescription,
                }
              : m,
        )
        return {
          ...c,
          messages: nextMsgs,
          title: c.titlePinned ? c.title : deriveTitle(nextMsgs),
          updatedAt: Date.now(),
        }
      })

      if (workbenchMode === 'ide') {
        setIdeAgentProgress(null)
      }
    },
    [
      activeId,
      conversations,
      messages,
      personalityId,
      ragEnabled,
      reasoningEnabled,
      llmSelection,
      updateConversation,
    ],
  )

  const redoRegenerateAt = useCallback(
    async (messageId: string) => {
      await sendMessage('', undefined, {
        regenerateFromMessageId: messageId,
      })
    },
    [sendMessage],
  )

  const canRedoMessage = useCallback(
    (messageId: string) => {
      if (!activeId) return false
      const conv = conversations.find((c) => c.id === activeId)
      if (!conv) return false
      return resolveRegenerateTurn(conv.messages, messageId) != null
    },
    [activeId, conversations],
  )

  const cancelAgentTurn = useCallback(() => {
    cancelActiveAgentTurn()
  }, [])

  return { sendMessage, redoRegenerateAt, canRedoMessage, cancelAgentTurn }
}

