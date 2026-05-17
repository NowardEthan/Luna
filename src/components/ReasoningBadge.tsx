import type { ReasoningTrace } from '../types/chat'
import { reasoningPreviewLine } from '../lib/reasoningStreamUi'
import { ReasoningTimelineContent } from './chat/ReasoningTimelineContent'
import { TimelineRow } from './chat/TimelineRow'
import { TurnTimeline } from './chat/TurnTimeline'

type Props = {
  trace?: ReasoningTrace
  inProgress?: boolean
  translating?: boolean
}

/** @deprecated Preferir AssistantTurn + timeline. Mantido para compatibilidade. */
export function ReasoningBadge({
  trace,
  inProgress = false,
  translating = false,
}: Props) {
  const displayText = trace?.text?.trim() ?? ''
  const showBlock =
    inProgress || translating || Boolean(displayText)
  if (!showBlock) return null

  let title = 'Pensamento'
  if (translating) title = 'A traduzir pensamento…'
  else if (inProgress) title = 'A pensar…'

  const preview =
    displayText && !translating && !inProgress
      ? reasoningPreviewLine(displayText)
      : undefined

  return (
    <TurnTimeline>
      <TimelineRow
        title={title}
        subtitle={preview}
        status={inProgress || translating ? 'loading' : 'neutral'}
      >
        <ReasoningTimelineContent
          trace={trace}
          inProgress={inProgress}
          translating={translating}
        />
      </TimelineRow>
    </TurnTimeline>
  )
}
