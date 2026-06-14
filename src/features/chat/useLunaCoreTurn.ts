import { useCallback, useRef } from 'react'
import type { Conversation } from '../../types/chat'
import { nextId } from '../chat/state/conversationPersistence'
import { useLunaCoreBilling } from '../billing/useLunaCoreBilling'
import {
  appendUserAndAssistantPlaceholder,
  applyLunaCoreError,
  applyLunaCoreResult,
  runLunaCoreTurn,
  type LunaCoreTurnDeps,
} from './lunaCoreTurnShared'

export type SendMessageOptions = {
  regenerateFromMessageId?: string
}

type Deps = {
  activeId: string
  conversations: Conversation[]
  updateConversation: LunaCoreTurnDeps['updateConversation']
  resolvePipelineOptions?: LunaCoreTurnDeps['resolvePipelineOptions']
  turnStatusHint?: string
}

export function useLunaCoreTurn(deps: Deps) {
  const abortRef = useRef<AbortController | null>(null)
  const billing = useLunaCoreBilling()

  const cancelAgentTurn = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const sendMessage = useCallback(
    async (userText: string, _images?: { name: string; dataUrl: string }[]) => {
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

      const turnDeps: LunaCoreTurnDeps = {
        activeId: deps.activeId,
        conversations: deps.conversations,
        updateConversation: deps.updateConversation,
        resolvePipelineOptions: deps.resolvePipelineOptions,
        turnStatusHint: deps.turnStatusHint,
        billing,
      }

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
    [deps, cancelAgentTurn, billing],
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
