import type { LunaLocaleId } from './types'

const EN_MARKERS =
  /\b(the|this is|that is|user is|user's|users|shared|screenshot|according to|should respond|i should|i will|good morning|let me|need to|want to|thinking|workspace|looks like)\b/i

const PT_MARKERS =
  /\b(que|não|você|usuário|português|bom dia|resposta|conversa|pessoa|está|será|vou|preciso)\b/i

export function isClearlyPortuguese(text: string): boolean {
  const t = text.trim()
  if (t.length < 20) return false

  if (/ção\b|ões\b|ência\b|nhã\b|ção:/i.test(t)) return true

  const lower = t.toLowerCase()
  const ptHits = (lower.match(/\b(não|que|você|usuário|português|bom dia|resposta|conversa|para|com|está|uma|um)\b/g) ?? [])
    .length
  const enHits = (lower.match(/\b(the|this|user|should|will|according|english|thinking)\b/g) ?? [])
    .length

  return ptHits >= 3 && ptHits > enHits
}

export function isLikelyEnglish(text: string): boolean {
  if (isClearlyPortuguese(text)) return false
  const t = text.trim()
  if (t.length < 16) return false

  if (EN_MARKERS.test(t)) return true
  if (PT_MARKERS.test(t) && !EN_MARKERS.test(t)) return false

  const words = t.split(/\s+/).filter(Boolean)
  if (words.length < 4) return /^[a-z\s.,'";:!?-]+$/i.test(t)

  let en = 0
  let pt = 0
  for (const w of words.slice(0, 100)) {
    const lw = w.toLowerCase()
    if (EN_MARKERS.test(lw)) en += 1
    if (PT_MARKERS.test(lw)) pt += 1
  }

  return en >= 2 || (en > pt && words.length >= 6)
}

/** Deteção heurística (rápida, sem dependência extra). */
export function detectLocale(text: string): LunaLocaleId | 'unknown' {
  if (isClearlyPortuguese(text)) return 'pt'
  if (isLikelyEnglish(text)) return 'en'
  return 'unknown'
}

export function localesMatchSource(
  text: string,
  target: LunaLocaleId,
): boolean {
  const detected = detectLocale(text)
  if (detected !== 'unknown' && detected === target) return true
  if (target === 'pt' && isClearlyPortuguese(text)) return true
  if (target === 'en' && isLikelyEnglish(text) && !isClearlyPortuguese(text)) {
    return true
  }
  return false
}
