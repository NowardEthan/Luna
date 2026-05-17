import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  STORAGE_KEY,
  deriveTitle,
  initialStore,
  sanitizeState,
  welcomeMessages,
} from '../lib/conversationStorage'
import {
  PERSONALITY_STORAGE_KEY,
  readStoredPersonality,
  type ChatPersonalityId,
} from '../lib/chatPersonality'
import {
  completeLlmChat,
  splitDataUrl,
  visionDescribeImages,
} from '../lib/togetherClient'
import {
  buildAgentFinalSystem,
  buildSystemCore,
  runAgentTurn,
} from '../agent'
import { TOOL_UI_LABELS } from '../agent/toolSchemas'
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
} from '../lib/lunaMemory'
import {
  isChatMemoryAvailable,
  syncChatMemoryFromConversations,
} from '../lib/chatMemoryClient'
import {
  insertTurnMessages,
  patchMemoryAfterRegenerate,
  resolveRegenerateTurn,
} from '../lib/regenerateTurn'
import { setIdeAgentProgress } from '../lib/ideAgentProgress'
import { localizeReasoningSegmentText } from '../lib/reasoningSegmentLocalize'
import { fetchServerDiagnosticLogs } from '../lib/lunaDiagnostics'
import { isAssistantErrorText } from '../lib/assistantMessageUi'
import {
  defaultUserMemory,
  loadUserMemory,
  saveUserMemory,
} from '../lib/userMemoryStorage'
import {
  readReasoningEnabled,
  writeReasoningEnabled,
} from '../lib/reasoningPreference'
import { readStreamingEnabled } from '../lib/llmStreamClient'
import { readWorkbenchMode } from '../lib/workbenchMode'
import { compileIdeContextBlock } from '../lib/ideContextCompiler'
import { parseIdeMentions } from '../lib/ideMentions'
import { getIdeTurnHost } from '../lib/ideTurnHost'
import {
  fetchLunaModelCatalog,
  readSelectedModelId,
  resolveSelectedOption,
  selectionFromOption,
  writeSelectedModelId,
  type LunaModelOption,
} from '../lib/llmModelSelection'
import type { LlmSelection } from '../lib/togetherClient'
import type {
  ChatFolder,
  Conversation,
  Message,
  ReasoningSegment,
} from '../types/chat'
import type { ConversationMemory, UserMemoryState } from '../types/memory'

function upsertReasoningSegment(
  segments: ReasoningSegment[] | undefined,
  patch: ReasoningSegment,
): ReasoningSegment[] {
  const list = [...(segments ?? [])]
  const idx = list.findIndex((s) => s.round === patch.round)
  const entry: ReasoningSegment = {
    ...(idx >= 0 ? list[idx] : { round: patch.round, text: '' }),
    ...patch,
  }
  if (idx >= 0) list[idx] = entry
  else list.push(entry)
  list.sort((a, b) => a.round - b.round)
  return list
}

function patchAssistantMessage(
  convId: string,
  assistantMsgId: string,
  updateConversation: (
    id: string,
    fn: (c: Conversation) => Conversation,
  ) => void,
  patch: (m: Message) => Message,
) {
  updateConversation(convId, (c) => ({
    ...c,
    messages: c.messages.map((m) =>
      m.id === assistantMsgId ? patch(m) : m,
    ),
    updatedAt: Date.now(),
  }))
}

const IMG_PLACEHOLDER = '(imagem anexada)'

export type SendMessageOptions = {
  /** Substitui o par utilizador+assistente e volta a pedir resposta ao modelo. */
  regenerateFromMessageId?: string
}

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function sortByUpdated(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => {
    const ap = a.pinned ? 1 : 0
    const bp = b.pinned ? 1 : 0
    if (ap !== bp) return bp - ap
    return b.updatedAt - a.updatedAt
  })
}

function seedStoreAfterDelete(): {
  conversations: Conversation[]
  folders: ChatFolder[]
  activeId: string
} {
  const id = nextId()
  const msgs = welcomeMessages(nextId)
  return {
    activeId: id,
    folders: [],
    conversations: sortByUpdated([
      {
        id,
        title: deriveTitle(msgs),
        folderId: null,
        messages: msgs,
        updatedAt: Date.now(),
      },
    ]),
  }
}

export function useConversations() {
  const [hydrated, setHydrated] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [folders, setFolders] = useState<ChatFolder[]>([])
  const [activeId, setActiveId] = useState('')
  const [personalityId, setPersonalityIdState] = useState<ChatPersonalityId>(
    readStoredPersonality,
  )
  const [ragEnabled, setRagEnabledState] = useState(() => {
    try {
      return localStorage.getItem('rag-enabled') === 'true'
    } catch {
      return false
    }
  })
  const [reasoningEnabled, setReasoningEnabledState] = useState(
    readReasoningEnabled,
  )
  const [modelCatalog, setModelCatalog] = useState<LunaModelOption[]>([])
  const [selectedModelId, setSelectedModelIdState] = useState<string | null>(
    readSelectedModelId,
  )
  const [modelCatalogLoading, setModelCatalogLoading] = useState(true)
  const [modelCatalogError, setModelCatalogError] = useState<string | null>(
    null,
  )
  const [userMemory, setUserMemory] = useState<UserMemoryState>(() =>
    defaultUserMemory(),
  )
  const userMemoryRef = useRef(userMemory)

  useEffect(() => {
    userMemoryRef.current = userMemory
  }, [userMemory])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setModelCatalogLoading(true)
      const res = await fetchLunaModelCatalog()
      if (cancelled) return
      if (!res.ok) {
        setModelCatalogError(res.error)
        setModelCatalog([])
        setModelCatalogLoading(false)
        return
      }
      setModelCatalogError(null)
      setModelCatalog(res.models)
      const picked = resolveSelectedOption(res.models, readSelectedModelId())
      if (picked) {
        setSelectedModelIdState(picked.id)
        writeSelectedModelId(picked.id)
      }
      setModelCatalogLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const llmSelection = useMemo((): LlmSelection | undefined => {
    const opt = resolveSelectedOption(modelCatalog, selectedModelId)
    return opt ? selectionFromOption(opt) : undefined
  }, [modelCatalog, selectedModelId])

  const setSelectedModelId = useCallback((id: string) => {
    setSelectedModelIdState(id)
    writeSelectedModelId(id)
  }, [])

  const setRagEnabled = useCallback((value: boolean) => {
    setRagEnabledState(value)
    try {
      localStorage.setItem('rag-enabled', value ? 'true' : 'false')
    } catch {
      /* ignore */
    }
  }, [])

  const setReasoningEnabled = useCallback((value: boolean) => {
    setReasoningEnabledState(value)
    writeReasoningEnabled(value)
  }, [])

  const setPersonality = useCallback((id: ChatPersonalityId) => {
    setPersonalityIdState(id)
    try {
      localStorage.setItem(PERSONALITY_STORAGE_KEY, id)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    setUserMemory(loadUserMemory())
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const parsed = sanitizeState(JSON.parse(raw) as unknown)
        if (parsed) {
          setConversations(parsed.conversations)
          setFolders(parsed.folders)
          setActiveId(parsed.activeId)
          setHydrated(true)
          return
        }
      } catch {
        /* fallback */
      }
    }
    const init = initialStore(nextId)
    setConversations(init.conversations)
    setFolders(init.folders)
    setActiveId(init.activeId)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      conversations,
      folders,
      activeId,
    }))
  }, [conversations, folders, activeId, hydrated])

  useEffect(() => {
    if (!hydrated) return
    saveUserMemory(userMemory)
  }, [userMemory, hydrated])

  useEffect(() => {
    if (!hydrated) return
    if (!isChatMemoryAvailable()) return
    const t = window.setTimeout(() => {
      void syncChatMemoryFromConversations(conversations)
    }, 2200)
    return () => window.clearTimeout(t)
  }, [hydrated, conversations])

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId),
    [conversations, activeId],
  )

  const messages = active?.messages ?? []

  useEffect(() => {
    if (!hydrated || !conversations.length) return
    if (!activeId || !conversations.some((c) => c.id === activeId)) {
      setActiveId(sortByUpdated(conversations)[0].id)
    }
  }, [hydrated, conversations, activeId])

  const updateConversation = useCallback(
    (
      conversationId: string,
      updater: (c: Conversation) => Conversation | null | undefined,
    ) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === conversationId)
        if (index === -1) return prev
        const patched = updater(prev[index])
        if (patched == null) {
          const minus = [...prev.slice(0, index), ...prev.slice(index + 1)]
          const sorted = sortByUpdated(minus)
          if (!sorted.length) {
            const empty = seedStoreAfterDelete()
            queueMicrotask(() => setActiveId(empty.activeId))
            queueMicrotask(() => setFolders(empty.folders))
            return empty.conversations
          }
          queueMicrotask(() => {
            setActiveId((cur) =>
              sorted.some((c) => c.id === cur)
                ? cur
                : sorted[0]?.id ?? cur,
            )
          })
          return sorted
        }
        const copy = [...prev]
        copy[index] = patched
        return sortByUpdated(copy)
      })
    },
    [],
  )

  const createConversation = useCallback(
    (opts?: { folderId?: string | null }) => {
      const id = nextId()
      const msgs = welcomeMessages(nextId)
      const want = opts?.folderId ?? null
      const folderId =
        want && folders.some((f) => f.id === want) ? want : null
      const convo: Conversation = {
        id,
        title: deriveTitle(msgs),
        folderId,
        messages: msgs,
        updatedAt: Date.now(),
      }
      setConversations((prev) => sortByUpdated([...prev, convo]))
      setActiveId(id)
    },
    [folders],
  )

  const renameConversation = useCallback(
    (conversationId: string, nextTitle: string) => {
      const t = nextTitle.replace(/\s+/g, ' ').trim()
      updateConversation(conversationId, (c) => {
        const title =
          t.length > 0 ? t.slice(0, 120) : deriveTitle(c.messages)
        return {
          ...c,
          title,
          titlePinned: t.length > 0,
          updatedAt: Date.now(),
        }
      })
    },
    [updateConversation],
  )

  const togglePinConversation = useCallback(
    (conversationId: string) => {
      updateConversation(conversationId, (c) => ({
        ...c,
        pinned: !c.pinned,
        updatedAt: Date.now(),
      }))
    },
    [updateConversation],
  )

  const moveConversationToFolder = useCallback(
    (conversationId: string, folderId: string | null) => {
      const valid =
        folderId && folders.some((f) => f.id === folderId) ? folderId : null
      updateConversation(conversationId, (c) => ({
        ...c,
        folderId: valid,
        updatedAt: Date.now(),
      }))
    },
    [folders, updateConversation],
  )

  const createFolder = useCallback((name: string) => {
    const n = name.replace(/\s+/g, ' ').trim().slice(0, 80)
    if (!n.length) return
    const folder: ChatFolder = {
      id: nextId(),
      name: n,
      createdAt: Date.now(),
    }
    setFolders((prev) => [...prev, folder])
  }, [])

  const renameFolder = useCallback((folderId: string, nextName: string) => {
    const n = nextName.replace(/\s+/g, ' ').trim().slice(0, 80)
    if (!n.length) return
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, name: n } : f)),
    )
  }, [])

  const deleteFolder = useCallback((folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId))
    setConversations((prev) =>
      sortByUpdated(
        prev.map((c) =>
          c.folderId === folderId ? { ...c, folderId: null } : c,
        ),
      ),
    )
  }, [])

  const deleteConversationById = useCallback((id: string) => {
    updateConversation(id, () => null)
  }, [updateConversation])

  const removeActiveConversation = useCallback(() => {
    if (!activeId) return
    deleteConversationById(activeId)
  }, [activeId, deleteConversationById])

  const selectConversation = useCallback((id: string) => {
    setActiveId(id)
  }, [])

  const sendMessage = useCallback(
    async (
      userText: string,
      imageAttachments?: { name: string; dataUrl: string }[],
      options?: SendMessageOptions,
    ) => {
      const convId = activeId
      if (!convId) return

      const regenerateId = options?.regenerateFromMessageId?.trim()
      let resolvedRedo = regenerateId
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
                  'Não foi possível ler as imagens (formato inválido). Tente outro arquivo ou captura de tela.',
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

      // Compactação: só mensagens deste chat (verbatim); RAG/recall ficam às tools do agente.
      let guard = 0
      while (guard++ < 12) {
        const fullSys = buildAgentFinalSystem(
          systemCore,
          userMemory,
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
                'Lembrete: o resumo deve privilegiar o que a pessoa (Usuário) disse; falas da Luna podem ser bem enxutas salvo fatos essenciais.\n\n' +
                `Resumo anterior desta conversa (só diálogo, pode estar vazio):\n${prevRoll}\n\nTrecho do diálogo a integrar:\n\n${dialogue}`,
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
                  text: 'Pensando…',
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
                ? { ...m, text: 'A analisar imagem…' }
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
                    ? { ...m, text: 'Pensando…' }
                    : m,
              ),
              updatedAt: Date.now(),
            }))
          } else {
            updateConversation(convId, (c) => ({
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, text: 'Pensando…' } : m,
              ),
              updatedAt: Date.now(),
            }))
          }
        }
      }

      const toolStatusLabel = (name: string) => {
        const base = TOOL_UI_LABELS[name] ?? name
        return `A usar ${base.toLowerCase()}…`
      }

      let agentResult: Awaited<ReturnType<typeof runAgentTurn>>
      try {
        agentResult = await runAgentTurn(
        {
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
                      text: 'A escrever resposta…',
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
                      text: 'A preparar ferramentas…',
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
        const msg =
          err instanceof Error
            ? err.message
            : 'Erro inesperado ao processar o turno.'
        agentResult = {
          assistantText: msg,
          agentSteps: [],
        }
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
      userMemory,
    ],
  )

  const setMemoryCrossChatEnabled = useCallback((enabled: boolean) => {
    setUserMemory((prev) => ({
      ...prev,
      crossChatEnabled: enabled,
      updatedAt: Date.now(),
    }))
  }, [])

  const clearUserProfileMemory = useCallback(() => {
    setUserMemory((prev) => ({
      ...defaultUserMemory(),
      crossChatEnabled: prev.crossChatEnabled,
      conversationSearchEnabled: prev.conversationSearchEnabled,
    }))
  }, [])

  const setConversationSearchEnabled = useCallback((enabled: boolean) => {
    setUserMemory((prev) => ({
      ...prev,
      conversationSearchEnabled: enabled,
      updatedAt: Date.now(),
    }))
  }, [])

  const clearActiveConversationMemory = useCallback(() => {
    if (!activeId) return
    updateConversation(activeId, (c) => {
      const { memory: _drop, ...rest } = c
      return { ...rest, updatedAt: Date.now() }
    })
  }, [activeId, updateConversation])

  const deleteMemoryNote = useCallback((noteId: string) => {
    setUserMemory((prev) => ({
      ...prev,
      memoryNotes: (prev.memoryNotes ?? []).filter((n) => n.id !== noteId),
      updatedAt: Date.now(),
    }))
  }, [])

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

  const foldersSorted = useMemo(
    () =>
      [...folders].sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
      ),
    [folders],
  )

  return {
    hydrated,
    conversations: sortByUpdated(conversations),
    folders: foldersSorted,
    activeId,
    messages,
    createConversation,
    selectConversation,
    deleteConversationById,
    removeActiveConversation,
    sendMessage,
    redoRegenerateAt,
    canRedoMessage,
    renameConversation,
    togglePinConversation,
    moveConversationToFolder,
    createFolder,
    renameFolder,
    deleteFolder,
    ragEnabled,
    setRagEnabled,
    reasoningEnabled,
    setReasoningEnabled,
    personalityId,
    setPersonality,
    memoryCrossChatEnabled: userMemory.crossChatEnabled,
    setMemoryCrossChatEnabled,
    memoryConversationSearchEnabled: userMemory.conversationSearchEnabled,
    setConversationSearchEnabled,
    clearUserProfileMemory,
    clearActiveConversationMemory,
    userMemory,
    deleteMemoryNote,
    modelCatalog,
    selectedModelId,
    setSelectedModelId,
    modelCatalogLoading,
    modelCatalogError,
    llmSelection,
  }
}
