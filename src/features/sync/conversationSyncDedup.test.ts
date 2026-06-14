import { describe, expect, it } from 'vitest'
import {
  conversationFingerprint,
  dedupeConversations,
  isWelcomeOnlyConversation,
} from './conversationSyncDedup'
import type { Conversation } from '../../types/chat'

function welcomeConvo(id: string, text: string): Conversation {
  return {
    id,
    title: text.slice(0, 40),
    folderId: null,
    messages: [{ id: 'm1', role: 'assistant', text }],
    updatedAt: Date.now(),
    cloudSync: { enabled: true },
  }
}

describe('conversationSyncDedup', () => {
  it('detects welcome-only clones', () => {
    const c = welcomeConvo('a', 'Oi, sou a Luna. Dá pra gente só conversar.')
    expect(isWelcomeOnlyConversation(c)).toBe(true)
  })

  it('dedupes same welcome with different ids', () => {
    const a = welcomeConvo('id-a', 'Oi, sou a Luna. Dá pra gente só conversar.')
    const b = welcomeConvo('id-b', 'Oi, sou a Luna. Dá pra gente só conversar.')
    b.updatedAt = a.updatedAt - 1000
    const out = dedupeConversations([a, b])
    expect(out).toHaveLength(1)
    expect(conversationFingerprint(out[0]!)).toBe(conversationFingerprint(a))
  })

  it('keeps distinct conversations when user sent a message', () => {
    const welcome = welcomeConvo('w', 'Oi, sou a Luna.')
    const real: Conversation = {
      ...welcome,
      id: 'real',
      messages: [
        ...welcome.messages,
        { id: 'u1', role: 'user', text: 'Olá' },
      ],
    }
    const out = dedupeConversations([welcome, real])
    expect(out).toHaveLength(2)
  })
})
