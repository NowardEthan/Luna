import type { ReactNode } from 'react'

type Props = {
  variant: 'user' | 'assistant'
  children: ReactNode
  className?: string
}

export function ChatBubble({ variant, children, className = '' }: Props) {
  const base =
    'max-w-[min(100%,42rem)] px-4 py-3 text-[14px] leading-relaxed shadow-soft'
  const variantClass =
    variant === 'user'
      ? 'rounded-2xl rounded-br-md border border-line-subtle bg-surface/95 text-fg'
      : 'rounded-2xl rounded-bl-md border border-line-subtle bg-raised/55 text-fg'

  return (
    <div className={`${base} ${variantClass} ${className}`.trim()}>
      {children}
    </div>
  )
}
