import type { AssistantTurnPhase } from '../../lib/assistantMessageUi'

export type LunaIndicatorPhase = AssistantTurnPhase | 'tool'

type Props = {
  phase: LunaIndicatorPhase
  size?: 'sm' | 'md'
  className?: string
}

const SIZE = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
} as const

/** Indicador visual animado por fase do turno da Luna. */
export function LunaPhaseIndicator({
  phase,
  size = 'md',
  className = '',
}: Props) {
  const box = SIZE[size]

  return (
    <span
      className={`luna-phase-indicator luna-phase-indicator--${phase} relative inline-flex shrink-0 items-center justify-center ${box} ${className}`}
      aria-hidden
    >
      {phase === 'connecting' ? (
        <span className="flex items-center gap-[3px]">
          <span className="luna-phase-dot h-1 w-1 rounded-full bg-accent" />
          <span className="luna-phase-dot h-1 w-1 rounded-full bg-accent" />
          <span className="luna-phase-dot h-1 w-1 rounded-full bg-accent" />
        </span>
      ) : null}

      {phase === 'thinking' ? (
        <span className="relative flex h-full w-full items-center justify-center">
          <span className="luna-phase-think-ring absolute inset-0 rounded-full border border-accent/40" />
          <span className="luna-phase-think-core h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_rgba(94,179,246,0.55)]" />
        </span>
      ) : null}

      {phase === 'translating' ? (
        <span className="flex items-center gap-0.5 text-[10px] font-bold text-accent">
          <span className="luna-phase-translate-a">A</span>
          <span className="luna-phase-translate-arrow text-[8px] opacity-70">⇄</span>
          <span className="luna-phase-translate-b">あ</span>
        </span>
      ) : null}

      {phase === 'writing' ? (
        <span className="flex h-3 items-end gap-[2px]">
          <span className="luna-phase-write-bar w-[3px] rounded-sm bg-accent" />
          <span className="luna-phase-write-bar w-[3px] rounded-sm bg-accent" />
          <span className="luna-phase-write-bar w-[3px] rounded-sm bg-accent" />
        </span>
      ) : null}

      {phase === 'tool' ? (
        <span className="relative flex h-full w-full items-center justify-center">
          <span className="luna-phase-tool-ring absolute inset-0 rounded-full border-2 border-dashed border-accent/35" />
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        </span>
      ) : null}

      {phase === 'waiting' ? (
        <span className="relative flex h-full w-full items-center justify-center">
          <span className="luna-phase-wait-ping absolute inline-flex h-full w-full rounded-full bg-accent/30" />
          <span className="relative h-2 w-2 rounded-full bg-accent/90" />
        </span>
      ) : null}
    </span>
  )
}
