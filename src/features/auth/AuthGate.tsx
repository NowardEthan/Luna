import type { ReactNode } from 'react'
import { useLunaAuth } from './AuthProvider'
import { FullscreenLoginGate } from './FullscreenLoginGate'

type Props = {
  app: ReactNode
}

/**
 * Decide o que renderizar no boot:
 *   - loading inicial (Firebase checando sessão) → tela de loading minimalista
 *   - sem user real → tela de login fullscreen (bloqueia app)
 *   - com user real → app
 *
 * Sem offline mode. App exige Conta Lunar.
 */
export function AuthGate({ app }: Props) {
  const auth = useLunaAuth()

  if (auth.loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-canvas">
        <span className="size-2 animate-pulse rounded-full bg-fg-dim" />
      </div>
    )
  }

  if (!auth.user) {
    return <FullscreenLoginGate />
  }

  return <>{app}</>
}
