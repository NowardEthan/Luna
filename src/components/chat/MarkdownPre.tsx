import { useRef, type ReactNode } from 'react'
import { copyWithToast } from '../../lib/toast'

type Props = {
  children: ReactNode
  className?: string
}

export function MarkdownPre({ children, className = '' }: Props) {
  const ref = useRef<HTMLPreElement>(null)

  return (
    <div className={`group/code relative mb-2.5 last:mb-0 ${className}`.trim()}>
      <button
        type="button"
        className="absolute right-2 top-2 z-[1] rounded-md border border-line bg-canvas/90 px-2 py-0.5 text-caption text-fg-muted opacity-0 transition-opacity hover:text-fg group-hover/code:opacity-100 focus-visible:opacity-100"
        onClick={() => {
          const text = ref.current?.textContent?.trim() ?? ''
          if (text) void copyWithToast(text)
        }}
        aria-label="Copiar código"
      >
        Copiar
      </button>
      <pre
        ref={ref}
        className="max-w-full overflow-x-auto rounded-lg border border-line-subtle bg-sidebar/80 p-2.5 pr-16"
      >
        {children}
      </pre>
    </div>
  )
}
