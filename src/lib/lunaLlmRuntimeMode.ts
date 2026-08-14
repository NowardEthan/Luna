/**
 * Preferência de runtime LLM — local (LM Studio/Ollama) vs cloud (Groq/servidor).
 *
 * Camadas:
 * 1. `.env` / perfis (`npm run luna-env:local|cloud`) — configuração real do Core
 * 2. `luna-llm-runtime-mode` (localStorage) — preferência do utilizador na UI
 * 3. `forceLocal` no pipeline — força fallback local mesmo com .env cloud (cota, BYOK, pref. local)
 */

export type LunaLlmRuntimePreference = 'auto' | 'local' | 'cloud'

export type LunaLlmDetectedMode = 'local' | 'cloud'

export type LunaLlmRuntimeInfo = {
  ok: boolean
  detectedMode?: LunaLlmDetectedMode
  lunaApiBase?: string
  modeloMaior?: string
  modeloMenor?: string
  ollamaBase?: string
  groqConfigured?: boolean
  error?: string
}

const PREFERENCE_KEY = 'luna-llm-runtime-mode'

export function readLlmRuntimePreference(): LunaLlmRuntimePreference {
  try {
    const v = globalThis.localStorage?.getItem(PREFERENCE_KEY)
    if (v === 'local' || v === 'cloud' || v === 'auto') return v
  } catch {
    /* ignore */
  }
  return 'auto'
}

export function writeLlmRuntimePreference(mode: LunaLlmRuntimePreference): void {
  try {
    globalThis.localStorage?.setItem(PREFERENCE_KEY, mode)
  } catch {
    /* ignore */
  }
}

/** Força LM Studio/Ollama no bridge quando o utilizador escolhe «Local» na UI. */
export function shouldForceLocalInPipeline(
  preference: LunaLlmRuntimePreference = readLlmRuntimePreference(),
): boolean {
  return preference === 'local'
}

export function resolveEffectiveLlmMode(
  detected: LunaLlmDetectedMode,
  preference: LunaLlmRuntimePreference = readLlmRuntimePreference(),
): LunaLlmDetectedMode {
  if (preference === 'local') return 'local'
  if (preference === 'cloud') return 'cloud'
  return detected
}

export function envMismatch(
  detected: LunaLlmDetectedMode,
  preference: LunaLlmRuntimePreference,
): boolean {
  if (preference === 'auto') return false
  return preference !== detected
}

export function preferenceSetupHint(
  preference: LunaLlmRuntimePreference,
): string | null {
  if (preference === 'local') {
    return 'npm run luna-env:local — LM Studio na porta 1234'
  }
  if (preference === 'cloud') {
    return 'npm run luna-env:cloud — chave Groq no luna-core/.env'
  }
  return null
}

/** Combina preferência UI, .env detectado e perfil local guardado. */
export function resolveEffectiveConfig(
  runtime: LunaLlmRuntimeInfo | null | undefined,
  preference: LunaLlmRuntimePreference = readLlmRuntimePreference(),
) {
  const detected: LunaLlmDetectedMode = runtime?.ok
    ? runtime.detectedMode ?? 'cloud'
    : 'cloud'
  const mode = resolveEffectiveLlmMode(detected, preference)
  return {
    mode,
    detected,
    preference,
    runtime: runtime ?? { ok: false },
  }
}

export async function fetchLlmRuntimeInfo(): Promise<LunaLlmRuntimeInfo> {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'Indisponível fora do browser.' }
  }

  const bridge = (
    window as unknown as {
      lunaCore?: { getLlmRuntimeInfo?: () => Promise<LunaLlmRuntimeInfo> }
    }
  ).lunaCore

  if (bridge?.getLlmRuntimeInfo) {
    try {
      const info = await bridge.getLlmRuntimeInfo()
      if (info && typeof info === 'object' && info.ok) return info
      if (info && typeof info === 'object' && info.error) return info
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('No handler registered')) {
        return { ok: false, error: msg }
      }
      /* handler em falta — tenta HTTP abaixo */
    }
  }

  const { fetchLlmRuntimeFromServer } = await import('./lunaLlmRuntimeClient')
  const fromServer = await fetchLlmRuntimeFromServer()
  if (fromServer) return fromServer

  if (!bridge?.getLlmRuntimeInfo) {
    return {
      ok: false,
      error: 'Reinicia o Orbit (npm run dev) para actualizar o Electron.',
    }
  }

  return {
    ok: false,
    error: 'Não foi possível ler o .env. Confirma que o servidor Luna está activo.',
  }
}
