import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  children: ReactNode
  className?: string
  /** Lista mais densa, sem linha vertical forte */
  compact?: boolean
}

export function TurnTimeline({ children, className = '', compact = false }: Props) {
  const { t } = useTranslation()
  return (
    <div
      className={`turn-timeline w-full ${compact ? 'turn-timeline--compact' : 'mb-2 max-w-[min(100%,42rem)]'} ${className}`.trim()}
      aria-label={t('chatTurn.timeline_aria')}
    >
      <ul
        className={
          compact
            ? 'turn-timeline__list turn-timeline__list--compact space-y-0'
            : 'turn-timeline__list relative ml-1 space-y-0.5 border-l border-line-subtle pl-3'
        }
      >
        {children}
      </ul>
    </div>
  )
}
