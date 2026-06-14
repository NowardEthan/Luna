import { useCallback, useState } from 'react'
import {
  PERSONALITY_STORAGE_KEY,
  readStoredPersonality,
  type ChatPersonalityId,
} from '../../../lib/chatPersonality'
import {
  readReasoningEnabled,
  writeReasoningEnabled,
} from '../../../lib/reasoningPreference'

/** Preferências de chat (personalidade, RAG, reasoning). Sem catálogo multi-LLM — chat usa Luna Core. */
export function useChatPreferencesStore() {
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

  return {
    personalityId,
    setPersonality,
    ragEnabled,
    setRagEnabled,
    reasoningEnabled,
    setReasoningEnabled,
  }
}
