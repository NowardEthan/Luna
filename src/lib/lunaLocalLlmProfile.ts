import type { LunaLlmRuntimeInfo } from './lunaLlmRuntimeMode'

/** Perfil LM Studio / Ollama guardado na app. */
export type LunaLocalLlmProfile = {
  baseUrl: string
  apiKey: string
  modeloMenor: string
  modeloMaior: string
  temperaturaMaior: number
}

export type LunaCoreConfigLuna = {
  apiKey: string
  baseUrl: string
  modeloMenor: string
  modeloMaior: string
  temperaturaMenor: number
  temperaturaMaior: number
  apiKeyMenor?: string
  baseUrlMenor?: string
}

export type LocalModelOption = {
  id: string
  label: string
}

const STORAGE_KEY = 'luna-local-llm-profile'

export const DEFAULT_LOCAL_LLM_PROFILE: LunaLocalLlmProfile = {
  baseUrl: 'http://127.0.0.1:1234/v1',
  apiKey: 'lm-studio',
  modeloMenor: '',
  modeloMaior: '',
  temperaturaMaior: 0.85,
}

export function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, '')
  if (!trimmed) return DEFAULT_LOCAL_LLM_PROFILE.baseUrl
  if (trimmed.includes('://')) return trimmed
  return `http://${trimmed}`
}

export function readLocalLlmProfile(): LunaLocalLlmProfile {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_LOCAL_LLM_PROFILE }
    const parsed = JSON.parse(raw) as Partial<LunaLocalLlmProfile>
    return {
      baseUrl: normalizeBaseUrl(parsed.baseUrl ?? DEFAULT_LOCAL_LLM_PROFILE.baseUrl),
      apiKey: parsed.apiKey?.trim() || DEFAULT_LOCAL_LLM_PROFILE.apiKey,
      modeloMenor: parsed.modeloMenor?.trim() ?? '',
      modeloMaior: parsed.modeloMaior?.trim() ?? '',
      temperaturaMaior:
        typeof parsed.temperaturaMaior === 'number' && !Number.isNaN(parsed.temperaturaMaior)
          ? parsed.temperaturaMaior
          : DEFAULT_LOCAL_LLM_PROFILE.temperaturaMaior,
    }
  } catch {
    return { ...DEFAULT_LOCAL_LLM_PROFILE }
  }
}

export function writeLocalLlmProfile(profile: LunaLocalLlmProfile): void {
  try {
    globalThis.localStorage?.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...profile,
        baseUrl: normalizeBaseUrl(profile.baseUrl),
      }),
    )
  } catch {
    /* ignore */
  }
}

export function mergeProfileWithRuntimeInfo(
  profile: LunaLocalLlmProfile,
  runtime: LunaLlmRuntimeInfo | null | undefined,
): LunaLocalLlmProfile {
  if (!runtime?.ok) return profile
  return {
    baseUrl: profile.baseUrl || normalizeBaseUrl(runtime.lunaApiBase ?? ''),
    apiKey: profile.apiKey || DEFAULT_LOCAL_LLM_PROFILE.apiKey,
    modeloMenor: profile.modeloMenor || runtime.modeloMenor || runtime.modeloMaior || '',
    modeloMaior: profile.modeloMaior || runtime.modeloMaior || runtime.modeloMenor || '',
    temperaturaMaior: profile.temperaturaMaior,
  }
}

export function toConfigLuna(profile: LunaLocalLlmProfile): LunaCoreConfigLuna {
  const modeloMaior = profile.modeloMaior.trim() || profile.modeloMenor.trim() || 'local'
  const modeloMenor = profile.modeloMenor.trim() || modeloMaior
  return {
    apiKey: profile.apiKey.trim() || DEFAULT_LOCAL_LLM_PROFILE.apiKey,
    baseUrl: normalizeBaseUrl(profile.baseUrl),
    modeloMenor,
    modeloMaior,
    temperaturaMenor: 0,
    temperaturaMaior: profile.temperaturaMaior,
  }
}

export function profileIsComplete(profile: LunaLocalLlmProfile): boolean {
  return Boolean(
    profile.baseUrl.trim() &&
      profile.modeloMenor.trim() &&
      profile.modeloMaior.trim(),
  )
}

export function localModelLabel(profile: LunaLocalLlmProfile): string {
  if (profile.modeloMenor === profile.modeloMaior) {
    return profile.modeloMaior || 'local'
  }
  return `${profile.modeloMenor} · ${profile.modeloMaior}`
}
