import type { LunaLocalLlmProfile, LocalModelOption } from './lunaLocalLlmProfile'
import { fetchLlmRuntimeFromServer } from './lunaLlmRuntimeClient'
import type { LunaLlmRuntimeInfo } from './lunaLlmRuntimeMode'

export type ListLocalModelsResult = {
  ok: boolean
  models?: LocalModelOption[]
  error?: string
}

export type TestLocalLlmResult = {
  ok: boolean
  latencyMs?: number
  modelCount?: number
  error?: string
}

export type ApplyLocalProfileResult = {
  ok: boolean
  coreEnvPath?: string
  orbitEnvPath?: string
  error?: string
}

async function invokeBridge<T>(
  fn: ((...args: never[]) => Promise<T>) | undefined,
  fallbackPath: string,
  fallbackQuery?: Record<string, string>,
): Promise<T | null> {
  if (fn) {
    try {
      return await fn()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('No handler registered')) throw err
    }
  }

  const bases: string[] = []
  try {
    const { isLunaServerBridgeAvailable, lunaServerBaseUrl } = await import(
      './lunaServer/config'
    )
    if (isLunaServerBridgeAvailable()) bases.push(lunaServerBaseUrl())
  } catch {
    /* ignore */
  }
  bases.push('http://127.0.0.1:39281')

  for (const base of bases) {
    try {
      const url = new URL(`${base}${fallbackPath}`)
      if (fallbackQuery) {
        for (const [k, v] of Object.entries(fallbackQuery)) {
          url.searchParams.set(k, v)
        }
      }
      const res = await fetch(url.toString())
      if (!res.ok) continue
      return (await res.json()) as T
    } catch {
      /* tenta próximo */
    }
  }
  return null
}

export async function listLocalModels(
  baseUrl: string,
  apiKey?: string,
): Promise<ListLocalModelsResult> {
  const bridge = window.lunaCore?.listLocalModels
  if (bridge) {
    return bridge({ baseUrl, apiKey })
  }
  const fromServer = await invokeBridge<ListLocalModelsResult>(
    undefined,
    '/v1/diagnostics/local-models',
    { baseUrl, apiKey: apiKey ?? 'lm-studio' },
  )
  return fromServer ?? { ok: false, error: 'Servidor Luna indisponível.' }
}

export async function testLocalLlmConnection(
  profile: Pick<LunaLocalLlmProfile, 'baseUrl' | 'apiKey' | 'modeloMaior'>,
): Promise<TestLocalLlmResult> {
  const bridge = window.lunaCore?.testLocalLlm
  if (bridge) {
    return bridge({
      baseUrl: profile.baseUrl,
      apiKey: profile.apiKey,
      modeloMaior: profile.modeloMaior,
    })
  }
  const fromServer = await invokeBridge<TestLocalLlmResult>(
    undefined,
    '/v1/diagnostics/local-models/test',
    {
      baseUrl: profile.baseUrl,
      apiKey: profile.apiKey,
      modeloMaior: profile.modeloMaior,
    },
  )
  return fromServer ?? { ok: false, error: 'Servidor Luna indisponível.' }
}

export async function applyLocalProfileToEnv(
  profile: LunaLocalLlmProfile,
): Promise<ApplyLocalProfileResult> {
  const bridge = window.lunaCore?.applyLocalProfile
  if (bridge) {
    return bridge(profile)
  }

  const bases: string[] = []
  try {
    const { isLunaServerBridgeAvailable, lunaServerBaseUrl } = await import(
      './lunaServer/config'
    )
    if (isLunaServerBridgeAvailable()) bases.push(lunaServerBaseUrl())
  } catch {
    /* ignore */
  }
  bases.push('http://127.0.0.1:39281')

  for (const base of bases) {
    try {
      const res = await fetch(`${base}/v1/diagnostics/local-profile/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      if (!res.ok) continue
      return (await res.json()) as ApplyLocalProfileResult
    } catch {
      /* tenta próximo */
    }
  }

  return {
    ok: false,
    error: 'Reinicia o Orbit (npm run dev) para activar «Aplicar ao .env».',
  }
}

export async function fetchLlmRuntimeInfoSafe(): Promise<LunaLlmRuntimeInfo | null> {
  if (window.lunaCore?.getLlmRuntimeInfo) {
    try {
      return await window.lunaCore.getLlmRuntimeInfo()
    } catch {
      /* fallback HTTP */
    }
  }
  return fetchLlmRuntimeFromServer()
}
