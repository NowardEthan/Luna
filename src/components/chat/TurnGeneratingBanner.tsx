import { useTranslation } from 'react-i18next'
import type { AssistantTurnPhase } from '../../lib/assistantMessageUi'
import { LunaPhaseIndicator } from './LunaPhaseIndicator'

type Props = {
  phase: AssistantTurnPhase
}

export function TurnGeneratingBanner({ phase }: Props) {
  const { t } = useTranslation()

  return (
    <div
      key={phase}
      className="luna-turn-banner mb-3 flex w-full max-w-[min(100%,42rem)] items-center gap-3 rounded-xl border border-accent/15 bg-canvas/80 px-3 py-2.5 shadow-sm backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LunaPhaseIndicator phase={phase} size="md" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium leading-snug text-fg">
          {t(`chatTurn.phase_${phase}`)}
        </p>
        <p className="mt-0.5 text-[10px] leading-snug text-fg-muted">
          {t('chatTurn.phase_hint')}
        </p>
      </div>
      <span className="luna-turn-banner-shimmer hidden h-8 w-1 shrink-0 rounded-full sm:block" aria-hidden />
    </div>
  )
}
