import { useState } from 'react'
import { BRAND_APP_NAME } from '../../brand'
import { useLunaAuth } from '../../features/auth/AuthProvider'

const DISMISS_KEY = 'luna-cloud-banner-dismiss'

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function writeDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    /* ignore */
  }
}

type Props = {
  className?: string
}

export function LunarCloudBanner({ className = '' }: Props) {
  const auth = useLunaAuth()
  const [dismissed, setDismissed] = useState(readDismissed)

  if (auth.isLunarConnected || dismissed || auth.loading) return null

  return (
    <div
      className={`border-b border-accent/25 bg-gradient-to-r from-accent/15 via-accent/8 to-transparent px-4 py-3 sm:px-5 ${className}`}
      role="region"
      aria-label="Conta Lunar"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">
            Conta Lunar
          </p>
          <p className="mt-0.5 text-ui font-medium text-fg">
            Desbloqueie modelos online, sincronização e a loja completa
          </p>
          <p className="mt-1 text-ui text-fg-muted">
            A {BRAND_APP_NAME} hospeda os modelos na nuvem — sem chaves no seu PC.
            Prefere só local? Continue com Ollama offline.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            className="luna-btn-primary px-4 py-2"
            onClick={() => void auth.signInWithGoogle()}
          >
            Entrar com Google
          </button>
          <button
            type="button"
            className="luna-btn-secondary px-3 py-2"
            onClick={() => auth.continueOffline()}
          >
            Só offline
          </button>
          <button
            type="button"
            className="px-2 py-2 text-ui text-fg-muted hover:text-fg"
            aria-label="Ocultar aviso"
            onClick={() => {
              writeDismissed()
              setDismissed(true)
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
