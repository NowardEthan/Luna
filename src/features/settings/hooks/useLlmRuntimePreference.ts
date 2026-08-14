import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchLlmRuntimeInfo,
  readLlmRuntimePreference,
  type LunaLlmRuntimeInfo,
  type LunaLlmRuntimePreference,
  writeLlmRuntimePreference,
} from '../../../lib/lunaLlmRuntimeMode'
import {
  applyLocalProfileToEnv,
  listLocalModels,
  testLocalLlmConnection,
} from '../../../lib/lunaLocalLlmClient'
import {
  mergeProfileWithRuntimeInfo,
  readLocalLlmProfile,
  writeLocalLlmProfile,
  type LunaLocalLlmProfile,
  type LocalModelOption,
} from '../../../lib/lunaLocalLlmProfile'

export function useLocalLlmProfile() {
  const [preference, setPreferenceState] = useState<LunaLlmRuntimePreference>(
    readLlmRuntimePreference,
  )
  const [runtimeInfo, setRuntimeInfo] = useState<LunaLlmRuntimeInfo | null>(null)
  const [profile, setProfile] = useState<LunaLocalLlmProfile>(() => readLocalLlmProfile())
  const [draft, setDraft] = useState<LunaLocalLlmProfile>(() => readLocalLlmProfile())
  const [models, setModels] = useState<LocalModelOption[]>([])
  const [loading, setLoading] = useState(true)
  const [discovering, setDiscovering] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [applyingEnv, setApplyingEnv] = useState(false)
  const [testResult, setTestResult] = useState<{
    ok: boolean
    message: string
  } | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const info = await fetchLlmRuntimeInfo()
      setRuntimeInfo(info)
      if (info?.ok) {
        const merged = mergeProfileWithRuntimeInfo(readLocalLlmProfile(), info)
        setProfile(merged)
        setDraft((prev) => ({
          ...merged,
          baseUrl: prev.baseUrl || merged.baseUrl,
          modeloMenor: prev.modeloMenor || merged.modeloMenor,
          modeloMaior: prev.modeloMaior || merged.modeloMaior,
        }))
      }
    } catch (err) {
      setRuntimeInfo({
        ok: false,
        error: err instanceof Error ? err.message : 'Erro ao ler o estado LLM.',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh, preference])

  const setPreference = useCallback((next: LunaLlmRuntimePreference) => {
    writeLlmRuntimePreference(next)
    setPreferenceState(next)
  }, [])

  const updateDraft = useCallback((patch: Partial<LunaLocalLlmProfile>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
    setTestResult(null)
    setActionMessage(null)
  }, [])

  const discoverModels = useCallback(async () => {
    setDiscovering(true)
    setActionMessage(null)
    try {
      const result = await listLocalModels(draft.baseUrl, draft.apiKey)
      if (!result.ok) {
        setModels([])
        setActionMessage(result.error ?? 'Não foi possível listar modelos.')
        return
      }
      setModels(result.models ?? [])
      if (!result.models?.length) {
        setActionMessage('Nenhum modelo listado — abre o LM Studio e carrega um modelo.')
      }
    } finally {
      setDiscovering(false)
    }
  }, [draft.apiKey, draft.baseUrl])

  const testConnection = useCallback(async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testLocalLlmConnection(draft)
      if (result.ok) {
        setTestResult({
          ok: true,
          message: `Ligação OK (${result.latencyMs ?? '?'} ms, ${result.modelCount ?? 0} modelos).`,
        })
      } else {
        setTestResult({
          ok: false,
          message: result.error ?? 'Falha no teste.',
        })
      }
    } finally {
      setTesting(false)
    }
  }, [draft])

  const saveProfile = useCallback(async () => {
    setSaving(true)
    setActionMessage(null)
    try {
      writeLocalLlmProfile(draft)
      setProfile(draft)
      setActionMessage('Perfil guardado — os próximos turnos usam estes modelos.')
    } finally {
      setSaving(false)
    }
  }, [draft])

  const applyToEnv = useCallback(async () => {
    setApplyingEnv(true)
    setActionMessage(null)
    try {
      writeLocalLlmProfile(draft)
      setProfile(draft)
      const result = await applyLocalProfileToEnv(draft)
      if (result.ok) {
        setActionMessage(
          'Perfil gravado no .env — reinicia npm run dev se o servidor não reflectir.',
        )
        await refresh()
      } else {
        setActionMessage(result.error ?? 'Não foi possível gravar no .env.')
      }
    } finally {
      setApplyingEnv(false)
    }
  }, [draft, refresh])

  const savedProfile = useMemo(() => profile, [profile])

  return {
    preference,
    setPreference,
    runtimeInfo,
    loading,
    refresh,
    profile: savedProfile,
    draft,
    updateDraft,
    models,
    discovering,
    discoverModels,
    testing,
    testConnection,
    testResult,
    saving,
    saveProfile,
    applyingEnv,
    applyToEnv,
    actionMessage,
  }
}

/** Mantém compatibilidade com imports antigos. */
export function useLlmRuntimePreference() {
  const hook = useLocalLlmProfile()
  return {
    preference: hook.preference,
    setPreference: hook.setPreference,
    runtimeInfo: hook.runtimeInfo,
    loading: hook.loading,
    refresh: hook.refresh,
  }
}
