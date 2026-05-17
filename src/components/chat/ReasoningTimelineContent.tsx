import type { ReasoningTrace } from '../../types/chat'
import { enrichReasoningDisplayMarkdown } from '../../lib/reasoningMarkdown'
import type { MemoryNote } from '../../types/memory'
import {
  localeLabel,
  readAutoTranslateEnabled,
  isLunaLocaleId,
  readUiLocale,
  type LunaLocaleId,
} from '../../translation'
import { AssistantMarkdown } from '../AssistantMarkdown'

type Props = {
  trace?: ReasoningTrace
  inProgress?: boolean
  translating?: boolean
  memoryNotes?: MemoryNote[]
  messageId?: string
}

function traceLocale(trace?: ReasoningTrace): LunaLocaleId {
  const raw = trace?.locale ?? trace?.displayLang
  if (raw && isLunaLocaleId(raw)) return raw
  return readUiLocale()
}

export function ReasoningTimelineContent({
  trace,
  inProgress = false,
  translating = false,
  memoryNotes,
  messageId,
}: Props) {
  const displayText = trace?.text?.trim() ?? ''
  const textOriginal = trace?.textOriginal?.trim()
  const showTranslated =
    (trace?.translated || textOriginal) &&
    !inProgress &&
    Boolean(displayText) &&
    readAutoTranslateEnabled()

  if (translating) {
    return (
      <p className="text-[11px] leading-relaxed text-fg-muted">
        A converter o pensamento para o idioma escolhido…
      </p>
    )
  }

  if (inProgress && !displayText) {
    return (
      <p className="text-[11px] leading-relaxed text-fg-muted">
        O raciocínio aparece aqui quando este passo terminar.
      </p>
    )
  }

  if (!displayText) return null

  const mdBody = enrichReasoningDisplayMarkdown(displayText)

  return (
    <div className="space-y-2">
      {showTranslated ? (
        <p className="text-[10px] text-fg-muted">
          Traduzido para {localeLabel(traceLocale(trace))}.
        </p>
      ) : null}
      <AssistantMarkdown
        content={mdBody}
        variant="reasoning"
        memoryNotes={memoryNotes}
        messageId={messageId}
      />
      {textOriginal && textOriginal !== displayText ? (
        <details className="rounded-md border border-line-subtle/70 bg-canvas/30 px-2 py-1">
          <summary className="cursor-pointer text-[10px] text-fg-muted">
            Ver original
          </summary>
          <div className="mt-1.5">
            <AssistantMarkdown
              content={enrichReasoningDisplayMarkdown(textOriginal)}
              variant="reasoning"
              memoryNotes={memoryNotes}
              messageId={messageId}
            />
          </div>
        </details>
      ) : null}
    </div>
  )
}
