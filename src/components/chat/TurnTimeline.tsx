import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
}

export function TurnTimeline({ children, className = '' }: Props) {
  return (
    <div
      className={`turn-timeline mb-2 w-full max-w-[min(100%,42rem)] ${className}`.trim()}
      aria-label="Atividade do turno"
    >
      <ul className="turn-timeline__list relative ml-1 space-y-0.5 border-l border-line-subtle pl-3">
        {children}
      </ul>
    </div>
  )
}
