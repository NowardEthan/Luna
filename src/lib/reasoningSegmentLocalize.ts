import { normalizeReasoningForDisplay } from '../translation'
import type { ReasoningSegment } from '../types/chat'

/** Traduz pensamento de uma ronda para o idioma da UI (ex. EN → PT). */
export async function localizeReasoningSegmentText(
  raw: string,
): Promise<Pick<ReasoningSegment, 'text' | 'textOriginal' | 'translated' | 'locale'>> {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { text: '' }
  }
  const norm = await normalizeReasoningForDisplay(trimmed)
  return {
    text: norm.text,
    ...(norm.textOriginal ? { textOriginal: norm.textOriginal } : {}),
    ...(norm.translated ? { translated: true } : {}),
    ...(norm.locale ? { locale: norm.locale } : {}),
  }
}
