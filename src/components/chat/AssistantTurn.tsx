import {
  isToolHighlight,
  useLunaBadgeNav,
} from '../../context/LunaBadgeNavigation'
import type { Message } from '../../types/chat'
import type { MemoryNote } from '../../types/memory'
import { enrichReasoningDisplayMarkdown } from '../../lib/reasoningMarkdown'
import {
  isAssistantErrorText,
  isAssistantStreamingText,
  shouldRenderAssistantBody,
  showAssistantStatusSpinner,
} from '../../lib/assistantMessageUi'
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
import { TurnTimeline } from './TurnTimeline'

type Props = {
  message: Message
  generating: boolean
  memoryNotes?: MemoryNote[]
}

export function AssistantTurn({ message: m, generating, memoryNotes }: Props) {
  const badgeNav = useLunaBadgeNav()
  const streaming = isAssistantStreamingText(m)
  const isError = !generating && isAssistantErrorText(m.text)
  const timelineItems = buildTurnTimelineItems(m, { generating })
  const showTimeline =
    hasMeaningfulTimeline(m, generating) ||
    timelineItems.some((i) => i.kind === 'status')

  const showBubble =
    streaming ||
    isError ||
    shouldRenderAssistantBody(m) ||
    (!generating && Boolean(m.text.trim()) && !showAssistantStatusSpinner(m))

  return (
    <div
      className={
        generating && !streaming
          ? 'animate-chat-message-in max-w-[min(100%,42rem)]'
          : 'animate-chat-message-in max-w-[min(100%,42rem)]'
      }
    >
      {showTimeline ? (
        <TurnTimeline>
          {timelineItems.map((item) => {
            if (item.kind === 'reasoning') {
              let title = 'Pensamento'
              if (item.translating) title = 'A traduzir pensamento…'
              else if (item.inProgress) title = 'A pensar…'
              const subtitle = reasoningTimelineSubtitle(m)
              const hasBody =
                item.inProgress ||
                item.translating ||
                Boolean(m.reasoningTrace?.text?.trim())
              return (
                <TimelineRow
                  key={item.id}
                  title={title}
                  subtitle={subtitle}
                  status={
                    item.inProgress || item.translating ? 'loading' : 'neutral'
                  }
                  static={!hasBody}
                  defaultOpen={generating}
                >
                  {hasBody ? (
                    <ReasoningTimelineContent
                      trace={m.reasoningTrace}
                      inProgress={item.inProgress}
                      translating={item.translating}
                      memoryNotes={memoryNotes}
                      messageId={m.id}
                    />
                  ) : null}
                </TimelineRow>
              )
            }

            if (item.kind === 'reasoning_round') {
              const title = item.translating
                ? `A traduzir pensamento (passo ${item.round})…`
                : item.inProgress
                  ? `A pensar (passo ${item.round})…`
                  : `Pensamento · passo ${item.round}`
              const subtitle = reasoningRoundSubtitle(
                item.text,
                item.inProgress && !item.translating,
              )
              const hasBody =
                item.translating ||
                item.inProgress ||
                Boolean(item.text.trim())
              return (
                <TimelineRow
                  key={item.id}
                  title={title}
                  subtitle={subtitle}
                  status={
                    item.inProgress || item.translating ? 'loading' : 'neutral'
                  }
                  static={!hasBody}
                  defaultOpen={generating || hasBody}
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
                    />
                  ) : null}
                </TimelineRow>
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
                  static={!hasDetail}
                  defaultOpen={hasDetail && (generating || step.ok)}
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
                static
              />
            )
          })}
        </TurnTimeline>
      ) : null}

      {showBubble ? (
        <ChatBubble variant="assistant">
          {streaming ? (
            <AssistantMarkdown
              content={enrichReasoningDisplayMarkdown(m.text)}
              variant="compact"
              memoryNotes={memoryNotes}
              messageId={m.id}
            />
          ) : isError ? (
            <AssistantErrorNotice
              text={m.text}
              diagnostics={m.turnDiagnostics}
            />
          ) : (
            <AssistantMarkdown
              content={enrichReasoningDisplayMarkdown(m.text)}
              variant="compact"
              memoryNotes={memoryNotes}
              messageId={m.id}
            />
          )}
        </ChatBubble>
      ) : null}
    </div>
  )
}
