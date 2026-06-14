import { invokeTranslation } from './client'
import { detectLocale, localesMatchSource } from './detect'
import { readAutoTranslateEnabled, readUiLocale } from './preferences'
import type {
  LocalizeOptions,
  LocalizedText,
  LunaLocaleId,
  TranslateRequest,
  TranslateResult,
} from './types'

const DEFAULT_MIN_LENGTH = 8

/**
 * Traduz texto para o idioma pedido (motor dedicado, sem LLM de chat).
 */
export async function translateText(
  text: string,
  request: Pick<TranslateRequest, 'to'> & { from?: LunaLocaleId },
): Promise<TranslateResult> {
  const trimmed = text.trim()
  if (!trimmed) return { ok: true, text: '' }

  return invokeTranslation({
    text: trimmed,
    to: request.to,
    ...(request.from ? { from: request.from } : {}),
  })
}

/** Indica se vale a pena localizar para o idioma da UI. */
export function shouldLocalize(
  text: string,
  target?: LunaLocaleId,
  minLength = DEFAULT_MIN_LENGTH,
): boolean {
  if (!readAutoTranslateEnabled()) return false
  const t = text.trim()
  if (t.length < minLength) return false

  const to = target ?? readUiLocale()
  if (localesMatchSource(t, to)) return false

  return t.length >= Math.max(minLength, 12)
}

/**
 * Localiza texto para o idioma da interface (traduz se necessário).
 * Uso global: pensamento, mensagens, RAG, etc.
 */
export async function localizeText(
  raw: string,
  options?: LocalizeOptions,
): Promise<LocalizedText> {
  const trimmed = raw.trim()
  const locale = options?.to ?? readUiLocale()
  if (!trimmed) return { text: '', locale }

  if (localesMatchSource(trimmed, locale)) {
    return { text: trimmed, locale }
  }

  const minLength = options?.minLength ?? DEFAULT_MIN_LENGTH
  const shouldTry =
    options?.force === true || shouldLocalize(trimmed, locale, minLength)

  if (!shouldTry) {
    return { text: trimmed, locale }
  }

  const detected = detectLocale(trimmed)
  const from =
    options?.from ??
    (detected !== 'unknown' && detected !== locale ? detected : undefined)

  const res = await translateText(trimmed, {
    to: locale,
    ...(from ? { from } : {}),
  })

  if (!res.ok) {
    return { text: trimmed, locale }
  }

  const out = res.text.trim()
  if (!out || out === trimmed) {
    return { text: trimmed, locale }
  }

  return {
    text: out,
    textOriginal: trimmed,
    translated: true,
    locale,
  }
}
