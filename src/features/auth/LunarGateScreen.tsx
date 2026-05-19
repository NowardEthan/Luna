import { BRAND_APP_NAME } from '../../brand'
import { useLunaAuth } from './AuthProvider'

type Props = {
  onClose?: () => void
  reason?: string | null
}

export function LunarGateScreen({ onClose, reason }: Props) {
  const auth = useLunaAuth()

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-canvas/90 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lunar-gate-title"
    >
      <div className="w-full max-w-md rounded-xl border border-line bg-sidebar p-6 shadow-xl">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">
          Conta Lunar
        </p>
        <h2 id="lunar-gate-title" className="mt-1 text-title font-semibold text-fg">
          Entrar na nuvem {BRAND_APP_NAME}
        </h2>
        <p className="mt-2 text-ui text-fg-muted">
          Modelos online, sincronização, loja e ferramentas completas exigem uma
          Conta Lunar. Podes continuar só com Ollama e dados locais.
        </p>
        {reason ? (
          <p className="mt-3 rounded-md border border-line-subtle bg-canvas px-3 py-2 text-ui text-fg-muted">
            {reason}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            className="luna-btn-primary w-full px-4 py-2.5"
            disabled={auth.loading || auth.googleSignInBusy || !auth.configured}
            onClick={() => void auth.signInWithGoogle()}
          >
            {auth.googleSignInBusy ? 'A abrir Google…' : 'Entrar com Google'}
          </button>
          <button
            type="button"
            className="luna-btn-secondary w-full px-4 py-2.5"
            onClick={() => {
              auth.continueOffline()
              onClose?.()
            }}
          >
            Continuar offline (Ollama e local)
          </button>
          {onClose ? (
            <button
              type="button"
              className="mt-1 text-ui text-fg-muted hover:text-fg"
              onClick={onClose}
            >
              Fechar
            </button>
          ) : null}
        </div>

        {auth.error ? (
          <p className="mt-3 text-ui text-red-400/90" role="alert">
            {auth.error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
