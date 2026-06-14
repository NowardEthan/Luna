import {
  buildReasoningFieldInstruction,
  localeIntlTag,
} from '../translation/localePrompts'
import {
  systemPromptUsesHarmonyMarker,
  usesHarmonyReasoningPrompt,
} from './reasoningHarmonyPrompt'
import type { LlmSelection } from './togetherClient'
import { readUiLocale } from '../translation/preferences'

export function lunaTemporalFacts(locale = readUiLocale()): {
  local: string
  iso: string
  year: number
  month: number
} {
  const now = new Date()
  const local = new Intl.DateTimeFormat(localeIntlTag(locale), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(now)
  return {
    local,
    iso: now.toISOString(),
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }
}

/** Bloco injectado no system a cada turno (data/hora do dispositivo). */
export function buildLunaTemporalSystemBlock(): string {
  const { local, iso, year, month } = lunaTemporalFacts()

  return (
    '\n\n---\n\n' +
    '**Relógio deste dispositivo (referência para “hoje”):** ' +
    `${local} (ISO: ${iso}). ` +
    `Ano civil actual: **${year}**, mês: **${month}**. ` +
    'Usa sempre esta data ao interpretar “recente”, “hoje”, “esta semana” ou “notícias actuais”. ' +
    'Se `web_search` devolver artigos de outro ano, diz a data que a fonte indica e não os trates como se fossem de hoje. ' +
    'Não inventes datas nem assumes que o ano das URLs/snippets é o ano actual.'
  )
}

const REASONING_FIELD_MARKER = 'luna-thinking-v3'

/**
 * Reforço só quando o toggle «Raciocínio» está ligado.
 * Uma vez no system — sem prefixo em cada mensagem user (evita meta-comentários no thinking).
 */
export function buildLunaReasoningFieldBlock(
  locale = readUiLocale(),
): string {
  return (
    '\n\n---\n\n' +
    `[${REASONING_FIELD_MARKER}] ` +
    buildReasoningFieldInstruction(locale)
  )
}

/** @deprecated use buildLunaReasoningFieldBlock */
export const buildLunaReasoningLanguageBlock = buildLunaReasoningFieldBlock

/** Acrescenta reforço de idioma só ao system (toggle «Raciocínio» ligado). */
export function injectReasoningLanguageIntoMessages<
  T extends { role: string; content?: unknown },
>(
  messages: T[],
  reasoningEnabled: boolean,
  llmSelection?: LlmSelection | null,
): T[] {
  if (!reasoningEnabled) return messages
  if (usesHarmonyReasoningPrompt(llmSelection, true)) return messages

  const copy = [...messages]
  const block = buildLunaReasoningFieldBlock()
  const sysIdx = copy.findIndex((m) => m.role === 'system')
  if (sysIdx < 0) return copy

  const current = copy[sysIdx]
  const prev =
    typeof current.content === 'string'
      ? current.content
      : current.content == null
        ? ''
        : String(current.content)

  if (
    prev.includes(REASONING_FIELD_MARKER) ||
    systemPromptUsesHarmonyMarker(prev)
  ) {
    return copy
  }

  copy[sysIdx] = {
    ...current,
    content: prev + block,
  } as T

  return copy
}

/** Lembrete curto após tools de pesquisa (mesmo turno). */
export function buildLunaTemporalResearchReminder(): string {
  const { local, year } = lunaTemporalFacts()
  return (
    `Referência temporal: agora é ${local} (ano ${year}). ` +
    'Cita a data de publicação de cada notícia quando a tool a trouxer; não rotules como “hoje” artigos de outro ano.'
  )
}
