import type { AgentStepRecord, Message, ReasoningSegment } from '../types/chat'
import { showAssistantStatusSpinner } from './assistantMessageUi'
import { reasoningPreviewLine } from './reasoningStreamUi'

export type TurnTimelineReasoningItem = {
  kind: 'reasoning'
  id: string
  inProgress: boolean
  translating: boolean
}

export type TurnTimelineReasoningRoundItem = {
  kind: 'reasoning_round'
  id: string
  round: number
  text: string
  textOriginal?: string
  translated?: boolean
  locale?: string
  inProgress: boolean
  translating: boolean
}

export type TurnTimelineToolItem = {
  kind: 'tool'
  id: string
  step: AgentStepRecord
  loading: boolean
}

export type TurnTimelineStatusItem = {
  kind: 'status'
  id: string
  label: string
}

export type TurnTimelineItem =
  | TurnTimelineReasoningItem
  | TurnTimelineReasoningRoundItem
  | TurnTimelineToolItem
  | TurnTimelineStatusItem

export type BuildTurnTimelineOptions = {
  generating: boolean
}

function showLegacyReasoningBlock(m: Message): boolean {
  if (m.reasoningSegments?.length) return false
  return Boolean(
    m.reasoningInProgress ||
      m.reasoningTranslating ||
      m.reasoningTrace?.text?.trim(),
  )
}

function collectToolSteps(m: Message): AgentStepRecord[] {
  const inProg = m.agentStepsInProgress ?? []
  const done = m.agentSteps ?? []
  const keys = new Set<string>()
  const out: AgentStepRecord[] = []

  for (const s of [...done, ...inProg]) {
    const key = `${s.tool}-${s.label}-${s.summary}-${s.attempt ?? 1}`
    if (keys.has(key)) continue
    keys.add(key)
    out.push(s)
  }
  return out
}

function segmentByRound(segments: ReasoningSegment[]): Map<number, ReasoningSegment> {
  const map = new Map<number, ReasoningSegment>()
  for (const s of segments) {
    map.set(s.round, s)
  }
  return map
}

function pushReasoningRound(
  items: TurnTimelineItem[],
  m: Message,
  round: number,
  seg: ReasoningSegment | undefined,
  generating: boolean,
) {
  const text =
    seg?.text?.trim() ||
    (generating && m.reasoningInProgress && m.orchestratorRound === round
      ? m.reasoningTrace?.text?.trim()
      : '') ||
    ''
  const inProgress = Boolean(
    seg?.inProgress ||
      (generating &&
        m.reasoningInProgress &&
        (m.orchestratorRound === round || !text)),
  )
  if (!text && !inProgress) return

  items.push({
    kind: 'reasoning_round',
    id: `${m.id}-reasoning-r${round}`,
    round,
    text: seg?.text?.trim() || text,
    textOriginal: seg?.textOriginal,
    translated: seg?.translated,
    locale: seg?.locale,
    inProgress,
    translating: Boolean(seg?.translating),
  })
}

function buildInterleavedItems(
  m: Message,
  toolSteps: AgentStepRecord[],
  segments: ReasoningSegment[],
  generating: boolean,
  inProgressSet: Set<string>,
): TurnTimelineItem[] {
  const items: TurnTimelineItem[] = []
  const segMap = segmentByRound(segments)
  const shownRounds = new Set<number>()

  const maxRound = Math.max(
    0,
    ...toolSteps.map((s) => s.orchestratorRound ?? 0),
    ...segments.map((s) => s.round),
    m.orchestratorRound ?? 0,
  )

  if (toolSteps.length === 0) {
    for (let r = 1; r <= maxRound; r++) {
      pushReasoningRound(items, m, r, segMap.get(r), generating)
    }
    return items
  }

  for (const step of toolSteps) {
    const r = step.orchestratorRound ?? 0
    if (r > 0 && !shownRounds.has(r)) {
      pushReasoningRound(items, m, r, segMap.get(r), generating)
      shownRounds.add(r)
    }
    items.push({
      kind: 'tool',
      id: `${m.id}-tool-${step.tool}-${step.attempt ?? 1}-${items.length}`,
      step,
      loading: generating && inProgressSet.has(step.tool) && !step.ok,
    })
  }

  for (let r = 1; r <= maxRound; r++) {
    if (!shownRounds.has(r) && segMap.has(r)) {
      pushReasoningRound(items, m, r, segMap.get(r), generating)
    }
  }

  return items
}

export function reasoningTimelineSubtitle(m: Message): string | undefined {
  if (m.reasoningTranslating) return undefined
  if (m.reasoningInProgress) return undefined
  const text = m.reasoningTrace?.text?.trim()
  if (!text) return undefined
  return reasoningPreviewLine(text, 56)
}

export function reasoningRoundSubtitle(
  text: string,
  inProgress: boolean,
): string | undefined {
  if (inProgress && !text.trim()) return undefined
  const t = text.trim()
  if (!t) return undefined
  return reasoningPreviewLine(t, 56)
}

export function buildTurnTimelineItems(
  m: Message,
  options: BuildTurnTimelineOptions,
): TurnTimelineItem[] {
  if (m.role !== 'assistant') return []

  const items: TurnTimelineItem[] = []
  const generating = options.generating
  const segments = m.reasoningSegments ?? []

  if (showLegacyReasoningBlock(m)) {
    items.push({
      kind: 'reasoning',
      id: `${m.id}-reasoning`,
      inProgress: Boolean(m.reasoningInProgress),
      translating: Boolean(m.reasoningTranslating),
    })
  }

  const toolSteps = collectToolSteps(m)
  const inProgressSet = new Set(
    (m.agentStepsInProgress ?? []).map((s) => s.tool),
  )

  if (segments.length > 0 || toolSteps.some((s) => s.orchestratorRound)) {
    items.push(
      ...buildInterleavedItems(m, toolSteps, segments, generating, inProgressSet),
    )
  } else {
    for (let i = 0; i < toolSteps.length; i++) {
      const step = toolSteps[i]
      items.push({
        kind: 'tool',
        id: `${m.id}-tool-${step.tool}-${i}-${step.attempt ?? 1}`,
        step,
        loading: generating && inProgressSet.has(step.tool) && !step.ok,
      })
    }
  }

  if (
    generating &&
    showAssistantStatusSpinner(m) &&
    !m.streamingActive
  ) {
    items.push({
      kind: 'status',
      id: `${m.id}-status`,
      label: m.text.trim() || 'A responder…',
    })
  }

  return items
}

export function hasTurnTimeline(m: Message, generating: boolean): boolean {
  return buildTurnTimelineItems(m, { generating }).length > 0
}

export function hasMeaningfulTimeline(
  m: Message,
  generating: boolean,
): boolean {
  const items = buildTurnTimelineItems(m, { generating })
  return items.some((i) => i.kind !== 'status')
}
