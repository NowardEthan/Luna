import type { ReactNode } from 'react'

type Props = {
  variant: 'user' | 'assistant'
  children: ReactNode
  className?: string
}

export function ChatBubble({ variant, children, className = '' }: Props) {
  const base =
    'max-w-[min(100%,42rem)] px-4 py-3 text-[14px] leading-relaxed transition-all'
  const variantClass =
    variant === 'user' ? 'chat-bubble chat-bubble--user' : 'chat-bubble chat-bubble--assistant'

  return (
    <div className={`${base} ${variantClass} ${className}`.trim()}>
      {children}
    </div>
  )
}
