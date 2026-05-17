import { bridgeTranslate } from '../lib/lunaBridge'
import type { TranslateRequest, TranslateResult } from './types'

/**
 * Tradução via servidor Luna (HTTP) ou IPC Electron.
 */
export async function invokeTranslation(
  request: TranslateRequest,
): Promise<TranslateResult> {
  const res = await bridgeTranslate({
    text: request.text,
    to: request.to,
    ...(request.from ? { from: request.from } : {}),
  })

  if (!res.ok) return res
  const text = res.text?.trim() ?? ''
  if (!text) return { ok: false, error: 'Tradução vazia.' }
  return { ok: true, text }
}
