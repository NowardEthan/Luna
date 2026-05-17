import type { MemoryKindId } from './memoryKinds'

/** Facto candidato a `save_memory` (regras locais, sem LLM). */
export type MemoryCandidate = {
  title: string
  detail: string
  kind?: MemoryKindId
}

function norm(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function pushUnique(
  out: MemoryCandidate[],
  title: string,
  detail: string,
  kind?: MemoryKindId,
): void {
  const t = norm(title)
  const d = norm(detail)
  if (!d.length) return
  const key = `${t.toLowerCase()}|${d.toLowerCase()}`
  if (out.some((c) => `${c.title.toLowerCase()}|${c.detail.toLowerCase()}` === key)) {
    return
  }
  out.push({ title: t || 'Memória', detail: d, ...(kind ? { kind } : {}) })
}

/**
 * Extrai factos prováveis da mensagem da pessoa (alta confiança, PT-BR).
 */
export function extractMemoryCandidates(userText: string): MemoryCandidate[] {
  const t = norm(userText)
  if (t.length < 8) return []

  const out: MemoryCandidate[] = []

  const nameFromPhrase = t.match(
    /\b(?:meu nome é|me chamo|pode(?:\s+me)?\s+chamar de)\s+([A-Za-zÀ-ÿ][\wÀ-ÿ'-]{1,24}(?:\s+[A-Za-zÀ-ÿ][\wÀ-ÿ'-]{1,24}){0,2})/i,
  )
  if (nameFromPhrase?.[1]) {
    pushUnique(out, 'Nome', `Chama-se ${nameFromPhrase[1].trim()}.`, 'identity')
  }

  const euSouNome = t.match(
    /^oi,?\s+eu sou (?:o|a)\s+([A-ZÁÉÍÓÚÀÂÊÔÃÕ][a-záéíóúàâêôãõ]+)\b/i,
  )
  if (euSouNome?.[1] && !/^(um|uma|o|a)$/i.test(euSouNome[1])) {
    pushUnique(out, 'Nome', `Chama-se ${euSouNome[1].trim()}.`, 'identity')
  }

  if (
    /\b(?:sou|sou um|sou uma)\s+(?:um\s+|uma\s+)?(programador|desenvolvedor|engenheir\w*|designer|estudante|arquiteto)\b/i.test(
      t,
    )
  ) {
    const m = t.match(
      /\b(?:sou|sou um|sou uma)\s+(?:um\s+|uma\s+)?((?:programador|desenvolvedor|engenheir\w*|designer|estudante|arquiteto)(?:\s+e\s+(?:programador|desenvolvedor|engenheir\w*|designer))?)/i,
    )
    const role = m?.[1] ? norm(m[1]) : 'programador / desenvolvedor'
    pushUnique(out, 'Profissão / papel', `É ${role}.`, 'identity')
  }

  if (
    /\b(?:trabalhando|desenvolvendo|a trabalhar|a desenvolver|trabalho)\b.*\b(?:você|voce|ti|luna|neste app|nesta arquitetura|em você|em voce)\b/i.test(
      t,
    ) ||
    /\barquitetura\s+(?:sua|tua|da luna)\b/i.test(t)
  ) {
    pushUnique(
      out,
      'Desenvolvimento da Luna',
      'Está a desenvolver ou a trabalhar na minha arquitetura / neste app (Luna v1).',
      'project',
    )
  }

  if (/\b(?:tenho|sou|diagnosticad[oa] com)\s+.*\b(?:tdah|autismo|autista|tea)\b/i.test(t)) {
    const bits: string[] = []
    if (/\btdah\b/i.test(t)) bits.push('TDAH')
    if (/\b(?:autismo|autista|tea)\b/i.test(t)) bits.push('autismo')
    pushUnique(
      out,
      'Neurodivergência',
      bits.length
        ? `Mencionou ${bits.join(' e ')} (só usar com respeito e no contexto dela).`
        : 'Mencionou neurodivergência.',
      'health',
    )
  }

  if (
    /\b(?:moro em|vivo em|sou de|minha cidade é)\s+([A-Za-zÀ-ÿ][\wÀ-ÿ\s-]{2,40})/i.test(
      t,
    )
  ) {
    const loc = t.match(
      /\b(?:moro em|vivo em|sou de|minha cidade é)\s+([A-Za-zÀ-ÿ][\wÀ-ÿ\s-]{2,40})/i,
    )
    if (loc?.[1]) {
      pushUnique(out, 'Localização', `Mora ou é de ${norm(loc[1])}.`, 'context')
    }
  }

  if (/\b(?:prefiro|gosto de|não gosto|não quero|evito)\b/i.test(t) && t.length >= 18) {
    pushUnique(out, 'Preferência', t.slice(0, 220), 'preference')
  }

  return out
}

/** Turno que merece revisão de memória (heurística + comprimento). */
export function shouldReviewMemoryForTurn(text: string): boolean {
  if (extractMemoryCandidates(text).length > 0) return true
  return isSubstantiveUserTurn(text)
}

export function isSubstantiveUserTurn(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length < 14) return false
  if (/^(oi|ol[aá]|hey|bom dia|boa tarde|boa noite|e a[ií])[!.?\s]*$/i.test(t)) {
    return false
  }
  if (
    /\b(?:sou|tenho|trabalho|desenvolv|programador|projecto|projeto|lembra|guarda|prefiro|tdah|autismo)\b/i.test(
      t,
    )
  ) {
    return true
  }
  return t.length >= 28
}
