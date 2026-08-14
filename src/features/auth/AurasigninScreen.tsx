/**
 * AurasigninScreen — wrapper da LoginScreen standalone integrada com AuthProvider do legacy.
 *
 * A LoginScreen é um componente local (./LoginScreen.tsx) que não tem nenhuma
 * dependência do projeto orbit — ícones SVG inline, sem lucide-react, design
 * system via CSS vars (bg-canvas, text-fg, etc.) compatível com Tailwind v4.
 */
import { useTranslation } from 'react-i18next'
import { useLunaAuth } from './AuthProvider'
import type { LoginMode } from './LoginScreen'
import { LoginScreen } from './LoginScreen'

type Props = {
  onClose?: () => void
  reason?: string | null
}

type LoginSubmitPayload = {
  mode: LoginMode
  email: string
  password: string
  name?: string
}

export function AurasigninScreen({ onClose, reason }: Props) {
  const { t } = useTranslation()
  const auth = useLunaAuth()
  const loading = auth.auraBusy || auth.googleSignInBusy

  const handleSubmit = async (payload: LoginSubmitPayload) => {
    if (payload.mode === 'criar') {
      await auth.createAccountAura(payload.name ?? '', payload.email, payload.password)
    } else {
      await auth.signInWithAura(payload.email, payload.password)
    }
  }

  return (
    <div className="px-7 pb-7 pt-10">
      {/* Brand header — alinhado com o design system legacy */}
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-[14px] text-accent">
          ✦
        </span>
        <span className="text-[13px] font-semibold text-fg">Luna</span>
      </div>

      <h2 className="text-[17px] font-semibold leading-snug text-fg">
        {t('lunarAccount.signIn.title', { appName: 'Luna' })}
      </h2>
      <p className="mt-1.5 text-[12px] text-fg-muted">
        {t('lunarAccount.signIn.description')}
      </p>

      {reason ? (
        <p className="mt-3 rounded-lg border border-line-subtle bg-canvas px-3 py-2 text-[12px] text-fg-muted">
          {reason}
        </p>
      ) : null}

      {/* LoginScreen standalone (local, sem deps do orbit) */}
      <div className="mt-5">
        <LoginScreen
          onSubmit={handleSubmit}
          onGoogle={() => void auth.signInWithGoogle()}
          error={auth.error ?? undefined}
          loading={loading}
        />
      </div>
    </div>
  )
}
