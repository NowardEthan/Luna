import {
  isLunaServerBridgeAvailable,
  lunaServerBaseUrl,
} from './lunaServer/config'
import type { LunaLlmRuntimeInfo } from './lunaLlmRuntimeMode'

export async function fetchLlmRuntimeFromServer(): Promise<LunaLlmRuntimeInfo | null> {
  const bases: string[] = []
  if (isLunaServerBridgeAvailable()) {
    bases.push(lunaServerBaseUrl())
  }
  bases.push('http://127.0.0.1:39281')

  for (const base of bases) {
    try {
      const res = await fetch(`${base}/v1/diagnostics/llm-runtime`)
      if (!res.ok) continue
      const json = (await res.json()) as LunaLlmRuntimeInfo
      if (json?.ok) return json
    } catch {
      /* tenta próximo */
    }
  }
  return null
}
