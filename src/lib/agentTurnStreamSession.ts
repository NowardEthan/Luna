import { readStreamingEnabled } from './llmStreamClient'
import {
  createSmoothStreamPlayer,
  DEFAULT_STREAM_WORDS_PER_SECOND,
  type SmoothStreamPlayer,
} from './smoothStreamPlayer'

/** Cursor-like: primeiro pensamento (Atividade), depois resposta (bolha). */
type StreamPhase = 'think' | 'answer'

export type AgentTurnStreamSession = {
  onReasoningSegmentDelta: (round: number, text: string) => void
  onAssistantDelta: (text: string) => void
  /** Espera o typewriter do raciocínio e só então abre a fase da resposta. */
  endReasoningRound: () => Promise<void>
  onPrepareSynthesis: () => Promise<void>
  flushBeforeFinalize: (finalBubbleText: string) => Promise<void>
  onToolsPending: () => void
  cancel: () => void
}

export function shouldSmoothStreamDisplay(): boolean {
  return readStreamingEnabled()
}

const streamPlayerOpts = {
  mode: 'word' as const,
  rate: DEFAULT_STREAM_WORDS_PER_SECOND,
}

export function createAgentTurnStreamSession(handlers: {
  smoothDisplay: boolean
  onBubbleVisible: (visible: string) => void
  onReasoningVisible: (round: number, visible: string) => void
  onSynthesisPrepare: () => void
}): AgentTurnStreamSession {
  const { smoothDisplay, onBubbleVisible, onReasoningVisible, onSynthesisPrepare } =
    handlers

  let phase: StreamPhase = 'answer'
  let sawReasoning = false
  let reasoningRound = 1
  let pendingAnswer = ''
  let bubblePlayer: SmoothStreamPlayer | null = null
  let reasoningPlayer: SmoothStreamPlayer | null = null
  let bubbleTarget = ''

  const newBubblePlayer = () =>
    createSmoothStreamPlayer(onBubbleVisible, streamPlayerOpts)

  const newReasoningPlayer = () =>
    createSmoothStreamPlayer(
      (visible) => onReasoningVisible(reasoningRound, visible),
      streamPlayerOpts,
    )

  const ensureBubblePlayer = () => {
    if (!bubblePlayer) bubblePlayer = newBubblePlayer()
    return bubblePlayer
  }

  if (smoothDisplay) {
    reasoningPlayer = newReasoningPlayer()
  }

  const startBubbleStream = (text: string) => {
    if (!text) return
    bubbleTarget = text
    if (!smoothDisplay) {
      onBubbleVisible(text)
      return
    }
    ensureBubblePlayer().pushTarget(text)
  }

  const beginAnswerPhase = () => {
    if (phase === 'answer') return
    phase = 'answer'
    reasoningPlayer?.cancel()
    const tail = pendingAnswer
    pendingAnswer = ''
    startBubbleStream(tail)
  }

  const pushAnswerTarget = (text: string) => {
    pendingAnswer = text
    if (phase === 'think') return
    if (text === bubbleTarget && bubblePlayer) return
    startBubbleStream(text)
  }

  return {
    onReasoningSegmentDelta(round, text) {
      reasoningRound = round
      sawReasoning = true
      phase = 'think'
      if (smoothDisplay && reasoningPlayer) {
        reasoningPlayer.pushTarget(text)
      } else {
        onReasoningVisible(round, text)
      }
    },

    onAssistantDelta(text) {
      if (!sawReasoning) {
        phase = 'answer'
        pushAnswerTarget(text)
        return
      }
      pendingAnswer = text
      if (phase === 'think') return
      pushAnswerTarget(text)
    },

    async endReasoningRound() {
      if (smoothDisplay && reasoningPlayer) {
        await reasoningPlayer.finish()
      }
      beginAnswerPhase()
    },

    async onPrepareSynthesis() {
      if (smoothDisplay && reasoningPlayer) {
        await reasoningPlayer.finish()
      }
      beginAnswerPhase()
      pendingAnswer = ''
      bubbleTarget = ''
      if (bubblePlayer) {
        bubblePlayer.cancel()
        bubblePlayer = newBubblePlayer()
      }
      onSynthesisPrepare()
    },

    onToolsPending() {
      phase = 'think'
      // Mantém pendingAnswer — o texto pode chegar só no fim do stream.
      if (bubblePlayer) {
        bubblePlayer.cancel()
        bubblePlayer = null
        bubbleTarget = ''
      }
    },

    async flushBeforeFinalize(finalBubbleText) {
      if (phase === 'think') {
        if (smoothDisplay && reasoningPlayer) {
          await reasoningPlayer.finish()
        }
        beginAnswerPhase()
      }
      if (!smoothDisplay) {
        if (finalBubbleText) onBubbleVisible(finalBubbleText)
        return
      }
      const player = ensureBubblePlayer()
      const final = finalBubbleText.trim()
      if (!final) {
        await player.finish()
        return
      }
      if (finalBubbleText !== bubbleTarget) {
        player.pushTarget(finalBubbleText)
        bubbleTarget = finalBubbleText
      }
      await player.finish()
    },

    cancel() {
      bubblePlayer?.cancel()
      reasoningPlayer?.cancel()
      bubblePlayer = null
      reasoningPlayer = null
      pendingAnswer = ''
      bubbleTarget = ''
    },
  }
}
