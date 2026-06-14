import { useCallback, useEffect, useMemo, useState } from 'react'
import { eventBus } from '../../../core/events/EventBus'
import {
  PERSONALITY_STORAGE_KEY,
  readStoredPersonality,
  type ChatPersonalityId,
} from '../../../lib/chatPersonality'
import {
  fetchLunaModelCatalog,
  readSelectedModelId,
  resolveSelectedOption,
  selectionFromOption,
  writeSelectedModelId,
  type LunaModelOption,
} from '../../../lib/llmModelSelection'
import type { LlmSelection } from '../../../lib/togetherClient'
import {
  readReasoningEnabled,
  writeReasoningEnabled,
} from '../../../lib/reasoningPreference'

export function useModelCatalogStore() {
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

  const reloadCatalog = useCallback(async () => {
    setModelCatalogLoading(true)
    const res = await fetchLunaModelCatalog()
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
    } else if (res.models[0]) {
      setSelectedModelIdState(res.models[0].id)
      writeSelectedModelId(res.models[0].id)
    }
    setModelCatalogLoading(false)
  }, [])

  useEffect(() => {
    void reloadCatalog()
  }, [reloadCatalog])

  useEffect(() => {
    const unsubs = [
      eventBus.on('auth:signed-in', () => {
        window.setTimeout(() => void reloadCatalog(), 300)
      }),
      eventBus.on('auth:signed-out', () => void reloadCatalog()),
      eventBus.on('lunar:auth-required', () => void reloadCatalog()),
      eventBus.on('lunar:usage-mode-changed', () => void reloadCatalog()),
    ]
    return () => unsubs.forEach((u) => u())
  }, [reloadCatalog])

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

  return {
    personalityId,
    setPersonality,
    ragEnabled,
    setRagEnabled,
    reasoningEnabled,
    setReasoningEnabled,
    modelCatalog,
    selectedModelId,
    setSelectedModelId,
    modelCatalogLoading,
    modelCatalogError,
    llmSelection,
  }
}
