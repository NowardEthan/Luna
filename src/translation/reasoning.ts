import { localesMatchSource } from './detect'
import { readUiLocale } from './preferences'
import { localizeText } from './service'
import type { LocalizedText } from './types'

/**
 * Normaliza raciocínio do modelo para o idioma da UI (traduz EN → PT, etc.).
 * Sempre tenta traduzir quando o texto não está já no idioma da interface.
 */
export async function normalizeReasoningForDisplay(
  raw: string,
): Promise<LocalizedText> {
  const trimmed = raw.trim()
  const locale = readUiLocale()
  if (!trimmed) return { text: '', locale }
  if (localesMatchSource(trimmed, locale)) {
    return { text: trimmed, locale }
  }
  return localizeText(trimmed, {
    to: locale,
    force: true,
    minLength: 4,
  })
}
