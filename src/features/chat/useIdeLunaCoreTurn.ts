import { useCallback, useMemo, useRef } from 'react'
import { compileIdePipelineOptions } from '../../lib/compileIdeContextForTurn'
import type { Conversation } from '../../types/chat'
import { nextId } from '../chat/state/conversationPersistence'
import {
  appendUserAndAssistantPlaceholder,
  applyLunaCoreError,
  applyLunaCoreResult,
  runLunaCoreTurn,
  type LunaCoreTurnDeps,
} from './lunaCoreTurnShared'
import type { SendMessageOptions } from './useLunaCoreTurn'

type Deps = {
  activeId: string
  conversations: Conversation[]
  ragEnabled: boolean
  updateConversation: LunaCoreTurnDeps['updateConversation']
}

export function useIdeLunaCoreTurn(deps: Deps) {
  const abortRef = useRef<AbortController | null>(null)
  const ragRef = useRef(deps.ragEnabled)
  ragRef.current = deps.ragEnabled

  const resolvePipelineOptions = useCallback(
    async (userText: string) =>
      compileIdePipelineOptions(userText, ragRef.current, []),
    [],
  )

  const turnDeps: LunaCoreTurnDeps = useMemo(
    () => ({
      activeId: deps.activeId,
      conversations: deps.conversations,
      updateConversation: deps.updateConversation,
      resolvePipelineOptions,
      turnStatusHint: 'A analisar o workspace e a memória...',
    }),
    [
      deps.activeId,
      deps.conversations,
      deps.updateConversation,
      resolvePipelineOptions,
    ],
  )

  const cancelAgentTurn = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const sendMessage = useCallback(
    async (
      userText: string,
      _images?: { name: string; dataUrl: string }[],
      _options?: SendMessageOptions,
    ) => {
      const convId = deps.activeId
      if (!convId) return

      const trimmed = userText.trim()
      if (!trimmed) return

      const conv = deps.conversations.find((c) => c.id === convId)

      cancelAgentTurn()
      const ac = new AbortController()
      abortRef.current = ac

      const assistantMsgId = nextId()
      appendUserAndAssistantPlaceholder(
        deps.updateConversation,
        convId,
        trimmed,
        assistantMsgId,
        conv,
      )

      try {
        const resultado = await runLunaCoreTurn({
          deps: turnDeps,
          userText: trimmed,
          abortSignal: ac.signal,
          convId,
          assistantMsgId,
        })
        applyLunaCoreResult(turnDeps, convId, assistantMsgId, resultado)
      } catch (err) {
        applyLunaCoreError(turnDeps, convId, assistantMsgId, err)
      } finally {
        if (abortRef.current === ac) abortRef.current = null
      }
    },
    [deps, turnDeps, cancelAgentTurn],
  )

  const canRedoMessage = useCallback(() => false, [])

  const redoRegenerateAt = useCallback(async (_messageId: string) => {
    /* desactivado no turno Luna Core */
  }, [])

  return {
    sendMessage,
    cancelAgentTurn,
    canRedoMessage,
    redoRegenerateAt,
  }
}
