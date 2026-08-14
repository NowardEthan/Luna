import { describe, expect, it } from 'vitest'
import { buildTurnTimelineItems } from './turnTimeline'
import type { Message } from '../types/chat'

function assistantMsg(partial: Partial<Message>): Message {
  return {
    id: 'a1',
    role: 'assistant',
    text: 'Olá!',
    ...partial,
  }
}

describe('turnTimeline reasoning', () => {
  it('não emite rodada 2 vazia', () => {
    const items = buildTurnTimelineItems(
      assistantMsg({
        lunaPipelineTrace: { intencao: 'conversa_casual' },
        reasoningSegments: [
          { round: 1, text: 'Narrativa pipeline', inProgress: false },
          { round: 2, text: '', inProgress: false },
        ],
      }),
      { generating: false },
    )
    const rounds = items.filter((i) => i.kind === 'reasoning_round')
    expect(rounds).toHaveLength(1)
    if (rounds[0]?.kind === 'reasoning_round') {
      expect(rounds[0].round).toBe(1)
    }
  })

  it('inclui rodada 2 com texto do modelo', () => {
    const items = buildTurnTimelineItems(
      assistantMsg({
        lunaPipelineTrace: { intencao: 'conversa_casual' },
        reasoningSegments: [
          { round: 1, text: 'Narrativa', inProgress: false },
          { round: 2, text: 'Penso que…', inProgress: false },
        ],
      }),
      { generating: false },
    )
    const rounds = items.filter((i) => i.kind === 'reasoning_round')
    expect(rounds).toHaveLength(2)
  })
})
