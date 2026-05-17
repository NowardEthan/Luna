import { isLunaServerBridgeAvailable, lunaServerBaseUrl } from './lunaServer/config'

export type ServerLogEntry = {
  ts: string
  level: string
  tag: string
  msg: string
  extra?: string
}

export async function fetchServerDiagnosticLogs(
  limit = 120,
): Promise<{ ok: true; text: string; lines: ServerLogEntry[] } | { ok: false; error: string }> {
  if (!isLunaServerBridgeAvailable()) {
    return { ok: false, error: 'Servidor Luna não está acessível (inicie npm run server).' }
  }
  try {
    const res = await fetch(
      `${lunaServerBaseUrl()}/v1/diagnostics/logs?limit=${limit}`,
      { signal: AbortSignal.timeout(8000) },
    )
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status} ao ler logs.` }
    }
    const data = (await res.json()) as {
      ok?: boolean
      text?: string
      lines?: ServerLogEntry[]
    }
    if (data.ok !== true) {
      return { ok: false, error: 'Resposta inválida do servidor.' }
    }
    return {
      ok: true,
      text: data.text ?? '',
      lines: Array.isArray(data.lines) ? data.lines : [],
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}
