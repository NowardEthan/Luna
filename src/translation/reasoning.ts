import { isLikelyEnglish } from './detect'
import { readAutoTranslateEnabled, readUiLocale } from './preferences'
import { localizeText } from './service'
import type { LocalizedText } from './types'

/** Normaliza raciocínio do modelo para o idioma da UI. */
export async function normalizeReasoningForDisplay(
  raw: string,
): Promise<LocalizedText> {
  const locale = readUiLocale()
  const force =
    readAutoTranslateEnabled() &&
    locale === 'pt' &&
    isLikelyEnglish(raw)

  return localizeText(raw, {
    minLength: 8,
    force,
    ...(force ? { from: 'en' as const } : {}),
  })
}
