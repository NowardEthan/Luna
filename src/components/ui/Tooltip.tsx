import { useId, useState, type ReactNode } from 'react'

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

type Props = {
  label: string
  children: ReactNode
  side?: TooltipSide
  /** Largura máxima do texto (ajusta automaticamente até este teto) */
  maxWidth?: string
}

const SIDE_CLASS: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  right: 'left-full top-1/2 ml-2.5 -translate-y-1/2',
}

const ARROW_CLASS: Record<TooltipSide, string> = {
  top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-b-0 border-r-0',
  bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-t-0 border-l-0',
  left: 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 border-r-0 border-b-0',
  right: 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 border-l-0 border-t-0',
}

export function Tooltip({
  label,
  children,
  side = 'bottom',
  maxWidth = '15rem',
}: Props) {
  const [visible, setVisible] = useState(false)
  const id = useId()

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <span aria-describedby={visible ? id : undefined}>{children}</span>
      {visible ? (
        <span
          id={id}
          role="tooltip"
          style={{ maxWidth }}
          className={`pointer-events-none absolute z-[70] w-max min-w-[8.5rem] animate-chat-message-in rounded-lg border border-line bg-raised px-2.5 py-1.5 text-ui leading-snug text-fg shadow-xl ${SIDE_CLASS[side]}`}
        >
          <span
            className={`absolute size-2 rotate-45 border border-line bg-raised ${ARROW_CLASS[side]}`}
            aria-hidden
          />
          <span className="relative block text-left">{label}</span>
        </span>
      ) : null}
    </span>
  )
}
