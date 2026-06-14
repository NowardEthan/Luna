import type { ReasoningTrace } from '../../types/chat'
import { enrichReasoningDisplayMarkdown } from '../../lib/reasoningMarkdown'
import { useReasoningStreamDisplay } from '../../lib/useReasoningStreamDisplay'
import type { MemoryNote } from '../../types/memory'
import {
  localeLabel,
  readAutoTranslateEnabled,
  isLunaLocaleId,
  readUiLocale,
  type LunaLocaleId,
} from '../../translation'
import { AssistantMarkdown } from '../AssistantMarkdown'
import { useTranslation } from 'react-i18next'

type Props = {
  trace?: ReasoningTrace
  inProgress?: boolean
  translating?: boolean
  memoryNotes?: MemoryNote[]
  messageId?: string
  /** Menos moldura — dentro do painel Atividade */
  compact?: boolean
}

function traceLocale(trace?: ReasoningTrace): LunaLocaleId {
  const raw = trace?.locale ?? trace?.displayLang
  if (raw && isLunaLocaleId(raw)) return raw
  return readUiLocale()
}

export function ReasoningTimelineContent({
  trace,
  inProgress = false,
  translating: _translating = false,
  memoryNotes,
  messageId,
  compact = false,
}: Props) {
  const { t } = useTranslation()
  const targetText = trace?.text?.trim() ?? ''
  const streaming = inProgress || _translating
  const displayText = useReasoningStreamDisplay(targetText, streaming)
  const textOriginal = trace?.textOriginal?.trim()
  const showTranslated =
    (trace?.translated || textOriginal) &&
    !inProgress &&
    Boolean(displayText) &&
    readAutoTranslateEnabled()

  if (!displayText) {
    if (_translating) {
      return (
        <p className="text-[11px] leading-relaxed text-fg-muted/60 animate-pulse">
          {t('chatTurn.reasoning_translating')}
        </p>
      )
    }
    if (inProgress) {
      return (
        <p className="text-[11px] leading-relaxed text-fg-muted/60 animate-pulse">
          {t('chatTurn.reasoning_in_progress')}
        </p>
      )
    }
    return null
  }

  const mdBody = enrichReasoningDisplayMarkdown(displayText)
  const mdVariant = compact ? 'reasoningCompact' : 'reasoning'

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <AssistantMarkdown
        content={mdBody}
        variant={mdVariant}
        memoryNotes={memoryNotes}
        messageId={messageId}
      />
      {textOriginal && textOriginal !== targetText ? (
        <details className="group/orig mt-2">
          <summary className="luna-chip inline-flex cursor-pointer select-none items-center gap-1.5 text-[10px] [&::-webkit-details-marker]:hidden">
            <span className="shrink-0 transition-transform duration-300 group-open/orig:rotate-90">▸</span>
            {showTranslated
              ? t('chatTurn.original_locale', {
                  locale: localeLabel(traceLocale(trace)),
                })
              : t('chatTurn.view_original')}
          </summary>
          <div className="mt-2.5 pl-3 border-l-2 border-line-subtle/30 opacity-0 group-open/orig:opacity-100 transition-opacity duration-300 luna-fade-in">
            <AssistantMarkdown
              content={enrichReasoningDisplayMarkdown(textOriginal)}
              variant={mdVariant}
              memoryNotes={memoryNotes}
              messageId={messageId}
            />
          </div>
        </details>
      ) : showTranslated ? (
        <p className="text-[10px] text-fg-muted">
          {t('chatTurn.translated_to', {
            locale: localeLabel(traceLocale(trace)),
          })}
        </p>
      ) : null}
    </div>
  )
}
