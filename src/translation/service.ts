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

  const to = request.to
  const detected = detectLocale(trimmed)
  const from =
    request.from ??
    (detected !== 'unknown' && detected !== to ? detected : undefined)

  return invokeTranslation({
    text: trimmed,
    to,
    ...(from ? { from } : {}),
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
  const minLength = options?.minLength ?? DEFAULT_MIN_LENGTH

  if (!trimmed) {
    return { text: '', locale }
  }

  const needsTranslate =
    options?.force === true || shouldLocalize(trimmed, locale, minLength)

  if (!needsTranslate) {
    return { text: trimmed, locale }
  }

  const tr = await translateText(trimmed, {
    to: locale,
    ...(options?.from ? { from: options.from } : {}),
  })

  if (!tr.ok) {
    return { text: trimmed, locale }
  }

  return {
    text: tr.text,
    textOriginal: trimmed,
    translated: true,
    locale,
  }
}
