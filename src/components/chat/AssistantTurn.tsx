import {
  isToolHighlight,
  useLunaBadgeNav,
} from '../../context/LunaBadgeNavigation'
import type { Message } from '../../types/chat'
import type { MemoryNote } from '../../types/memory'
import { enrichReasoningDisplayMarkdown } from '../../lib/reasoningMarkdown'
import {
  isAssistantErrorText,
  isAnswerStreaming,
  readAssistantTurnPhase,
  shouldShowResponseBubble,
} from '../../lib/assistantMessageUi'
import { TurnGeneratingBanner } from './TurnGeneratingBanner'
import {
  buildActivitySummary,
  countActivitySteps,
} from '../../lib/turnActivitySummary'
import {
  buildTurnTimelineItems,
  hasMeaningfulTimeline,
  reasoningRoundSubtitle,
  reasoningTimelineSubtitle,
} from '../../lib/turnTimeline'
import { AssistantErrorNotice } from '../AssistantErrorNotice'
import { AssistantMarkdown } from '../AssistantMarkdown'
import { ChatBubble } from './ChatBubble'
import { ReasoningTimelineContent } from './ReasoningTimelineContent'
import { TimelineRow } from './TimelineRow'
import { toolStepSubtitle, ToolStepDetailBody } from './toolStepDetails'
import { LunaPipelineActivityBody } from './LunaPipelineActivityBody'
import { TurnActivityPanel } from './TurnActivityPanel'
import { TurnTimeline } from './TurnTimeline'
import { TranslatedMessageBlock } from './TranslatedMessageBlock'
import { useTranslation } from 'react-i18next'

type Props = {
  message: Message
  generating: boolean
  memoryNotes?: MemoryNote[]
}

function renderTimelineItems(
  timelineItems: ReturnType<typeof buildTurnTimelineItems>,
  m: Message,
  memoryNotes: MemoryNote[] | undefined,
  badgeNav: ReturnType<typeof useLunaBadgeNav>,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  return timelineItems.map((item) => {
    if (item.kind === 'reasoning') {
      const title = t('chatTurn.reasoning')
      const subtitle = item.translating
        ? t('chatTurn.translating')
        : item.inProgress
          ? t('chatTurn.in_progress')
          : reasoningTimelineSubtitle(m)
      const hasBody =
        item.inProgress ||
        item.translating ||
        Boolean(m.reasoningTrace?.text?.trim())
      const live = item.inProgress || item.translating
      return (
        <TimelineRow
          key={item.id}
          title={title}
          subtitle={subtitle}
          status={live ? 'loading' : 'neutral'}
          loadingPhase={item.translating ? 'translating' : 'thinking'}
          static={!hasBody}
          defaultOpen={live}
          compact
        >
          {hasBody ? (
            <ReasoningTimelineContent
              trace={m.reasoningTrace}
              inProgress={item.inProgress}
              translating={item.translating}
              memoryNotes={memoryNotes}
              messageId={m.id}
              compact
            />
          ) : null}
        </TimelineRow>
      )
    }

    if (item.kind === 'reasoning_round' && m.lunaPipelineTrace) {
      const live = item.inProgress || item.translating
      return (
        <TimelineRow
          key={item.id}
          title={t('chatTurn.luna_pipeline')}
          subtitle={
            live
              ? t('chatTurn.in_progress')
              : t('chatTurn.luna_pipeline_subtitle')
          }
          status={live ? 'loading' : 'ok'}
          loadingPhase="thinking"
          defaultOpen={live}
          compact
        >
          <LunaPipelineActivityBody trace={m.lunaPipelineTrace} />
        </TimelineRow>
      )
    }

    if (item.kind === 'reasoning_round') {
      const title = t('chatTurn.step', { round: item.round })
      const subtitle = item.translating
        ? t('chatTurn.translating')
        : item.inProgress
          ? t('chatTurn.in_progress')
          : reasoningRoundSubtitle(item.text, item.inProgress && !item.translating)
      const hasBody =
        item.translating ||
        item.inProgress ||
        Boolean(item.text.trim())
      const live = item.inProgress || item.translating
      return (
        <TimelineRow
          key={item.id}
          title={title}
          subtitle={subtitle}
          status={live ? 'loading' : 'neutral'}
          loadingPhase={item.translating ? 'translating' : 'thinking'}
          static={!hasBody}
          defaultOpen={live}
          compact
        >
          {hasBody ? (
            <ReasoningTimelineContent
              trace={{
                text: item.text,
                textOriginal: item.textOriginal,
                translated: item.translated,
                locale: item.locale,
              }}
              inProgress={item.inProgress && !item.translating}
              translating={item.translating}
              memoryNotes={memoryNotes}
              messageId={m.id}
              compact
            />
          ) : null}
        </TimelineRow>
      )
    }

    if (item.kind === 'answer') {
      const subtitle = item.inProgress
        ? t('chatTurn.in_progress')
        : item.preview
      return (
        <TimelineRow
          key={item.id}
          title={t('chatTurn.answer')}
          subtitle={subtitle}
          status={item.inProgress ? 'loading' : 'ok'}
          loadingPhase="writing"
          static
          compact
        />
      )
    }

    if (item.kind === 'tool') {
      const { step, loading } = item
      const hasDetail = Boolean(step.detail)
      return (
        <TimelineRow
          key={item.id}
          title={step.label}
          toolId={step.tool}
          subtitle={toolStepSubtitle(step)}
          status={loading ? 'loading' : step.ok ? 'ok' : 'error'}
          loadingPhase="tool"
          static={!hasDetail}
          defaultOpen={loading}
          compact
          anchorMessageId={m.id}
          highlighted={isToolHighlight(
            badgeNav?.highlight ?? null,
            m.id,
            step.tool,
          )}
        >
          {hasDetail ? <ToolStepDetailBody step={step} /> : null}
        </TimelineRow>
      )
    }

    return (
      <TimelineRow
        key={item.id}
        title={item.label}
        status="loading"
        loadingPhase="waiting"
        static
        compact
      />
    )
  })
}

export function AssistantTurn({ message: m, generating, memoryNotes }: Props) {
  const { t } = useTranslation()
  const badgeNav = useLunaBadgeNav()
  const answerStreaming = isAnswerStreaming(m)
  const turnPhase = generating ? readAssistantTurnPhase(m) : undefined
  const isError = !generating && isAssistantErrorText(m.text)
  const timelineItems = buildTurnTimelineItems(m, { generating })
  const activityItems = timelineItems.filter((i) => i.kind !== 'status')
  const showTimeline =
    hasMeaningfulTimeline(m, generating) ||
    timelineItems.some((i) => i.kind === 'status')

  const showBubble = shouldShowResponseBubble(m, generating) || isError

  const bubble = showBubble ? (
    <ChatBubble variant="assistant">
      {answerStreaming ? (
        <TranslatedMessageBlock content={m.text}>
          {(translatedText) => (
            <>
              <AssistantMarkdown
                content={enrichReasoningDisplayMarkdown(translatedText)}
                variant="compact"
                memoryNotes={memoryNotes}
                messageId={m.id}
              />
              <span
                className="luna-stream-cursor ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] bg-accent"
                aria-hidden
              />
            </>
          )}
        </TranslatedMessageBlock>
      ) : isError ? (
        <AssistantErrorNotice text={m.text} diagnostics={m.turnDiagnostics} />
      ) : (
        <TranslatedMessageBlock content={m.text}>
          {(translatedText) => (
            <AssistantMarkdown
              content={enrichReasoningDisplayMarkdown(translatedText)}
              variant="compact"
              memoryNotes={memoryNotes}
              messageId={m.id}
            />
          )}
        </TranslatedMessageBlock>
      )}
    </ChatBubble>
  ) : null

  const activityOpen =
    generating &&
    (m.reasoningInProgress === true ||
      m.reasoningStreamingActive === true ||
      m.reasoningTranslating === true ||
      Boolean(m.reasoningSegments?.some((s) => s.inProgress)) ||
      isAnswerStreaming(m))

  const activity =
    showTimeline && activityItems.length > 0 ? (
      <TurnActivityPanel
        summary={
          m.llmProvider === 'luna-core' && m.lunaPipelineTrace
            ? t('chatTurn.luna_activity_summary')
            : buildActivitySummary(activityItems)
        }
        stepCount={countActivitySteps(timelineItems)}
        defaultOpen={activityOpen}
        live={activityOpen}
      >
        <TurnTimeline compact>
          {renderTimelineItems(timelineItems, m, memoryNotes, badgeNav, t)}
        </TurnTimeline>
      </TurnActivityPanel>
    ) : showTimeline ? (
      <TurnTimeline compact>
        {renderTimelineItems(timelineItems, m, memoryNotes, badgeNav, t)}
      </TurnTimeline>
    ) : null

  return (
    <div className="animate-chat-message-in flex w-full max-w-[min(100%,42rem)] flex-col">
      {turnPhase ? <TurnGeneratingBanner phase={turnPhase} /> : null}
      {activity}
      {bubble}
    </div>
  )
}
