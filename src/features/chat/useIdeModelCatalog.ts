import { useCallback, useEffect, useState } from 'react'
import { loadIdeModelCatalog } from '../../lib/ideLlmSelection'
import {
  readSelectedModelId,
  type LunaModelOption,
} from '../../lib/llmModelSelection'

/** Catálogo LLM lazy — só carrega quando IDE ou Finanças estão activos. */
export function useIdeModelCatalog(active: boolean) {
  const [modelCatalog, setModelCatalog] = useState<LunaModelOption[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(
    readSelectedModelId,
  )

  const reload = useCallback(async () => {
    setLoading(true)
    const models = await loadIdeModelCatalog()
    setModelCatalog(models)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!active) return
    void reload()
  }, [active, reload])

  useEffect(() => {
    if (!active) return
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'luna-selected-model-id') {
        setSelectedModelId(readSelectedModelId())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [active])

  return { modelCatalog, selectedModelId, loading, reload }
}
