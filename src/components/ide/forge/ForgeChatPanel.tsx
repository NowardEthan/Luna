import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

/** Painel de chat isolado no Forge — scroll próprio, sem interferir no editor. */
export function ForgeChatPanel({ children }: Props) {
  return (
    <div className="forge-chat-isolated flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  )
}
