import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BRAND_APP_NAME } from '../../brand'
import { useLunaAuth } from './AuthProvider'
import type { LoginMode } from './LoginScreen'
import { LoginScreen } from './LoginScreen'

type LoginSubmitPayload = {
  mode: LoginMode
  email: string
  password: string
  name?: string
}

/**
 * Tela de login fullscreen — exibida no boot quando o user não está logado.
 * Compacta e cabe em 460×720 sem scroll.
 *
 * Trava o tamanho da janela enquanto está ativa — não dá pra arrastar a
 * borda pra redimensionar. Destrava ao desmontar (login OK → app assume).
 */
export function FullscreenLoginGate() {
  const { t } = useTranslation()
  const auth = useLunaAuth()
  const loading = auth.auraBusy || auth.googleSignInBusy
  const [mode, setMode] = useState<LoginMode>('entrar')

  useEffect(() => {
    // Trava ao montar.
    void window.electron?.setLockSize?.(true)
    // Reset busy flags — quando a tela monta (reload pós-logout ou troca de conta),
    // garante que nenhum spinner ficou preso de uma promise pendurada.
    auth.resetAuthBusy?.()
    return () => {
      // Destrava ao desmontar (entrar ou criar conta → AppShell).
      void window.electron?.setLockSize?.(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (payload: LoginSubmitPayload) => {
    if (payload.mode === 'criar') {
      await auth.createAccountAura(payload.name ?? '', payload.email, payload.password)
    } else {
      await auth.signInWithAura(payload.email, payload.password)
    }
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-canvas px-4 py-3">
      <div className="w-full max-w-[400px] rounded-2xl border border-line-subtle bg-sidebar p-5 shadow-xl">
        {/* Brand header */}
        <div className="mb-3 flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-xl text-accent"
            style={{ backgroundColor: 'var(--color-accent-muted)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2 L14 9 L21 12 L14 15 L12 22 L10 15 L3 12 L10 9 Z" />
            </svg>
          </span>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold text-fg">
              {auth.user ? 'Luna' : mode === 'criar' ? 'Criar Conta Aura' : 'Entrar na Luna'}
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-fg-muted">
              Orbit · Luna
            </div>
          </div>
        </div>

        <LoginScreen
          defaultMode={mode}
          onModeChange={setMode}
          onSubmit={handleSubmit}
          onGoogle={() => void auth.signInWithGoogle()}
          error={auth.error ?? undefined}
          loading={loading}
        />
      </div>
    </div>
  )
}
