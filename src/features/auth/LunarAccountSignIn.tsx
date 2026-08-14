import { BRAND_APP_NAME } from '../../brand'
import { useTranslation } from 'react-i18next'
import { useLunaAuth } from './AuthProvider'

type Props = {
  onClose?: () => void
  reason?: string | null
}

const BENEFITS = [
  { icon: '◈', label: 'Memória e personalidade persistente na nuvem' },
  { icon: '⬡', label: 'Luna Forge IDE em todos os dispositivos' },
  { icon: '✦', label: 'Planos a partir de R$25/mês' },
]

export function LunarAccountSignIn({ onClose, reason }: Props) {
  const { t } = useTranslation()
  const auth = useLunaAuth()

  return (
    <div className="px-7 pb-7 pt-10">
      {/* Brand */}
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-[14px] text-accent">
          ✦
        </span>
        <span className="text-[13px] font-semibold text-fg">{BRAND_APP_NAME}</span>
      </div>

      <h2
        id="lunar-account-title"
        className="text-[17px] font-semibold leading-snug text-fg"
      >
        {t('lunarAccount.signIn.title', { appName: BRAND_APP_NAME })}
      </h2>
      <p className="mt-1.5 text-[12px] text-fg-muted">
        {t('lunarAccount.signIn.description')}
      </p>

      {reason ? (
        <p className="mt-3 rounded-lg border border-line-subtle bg-canvas px-3 py-2 text-[12px] text-fg-muted">
          {reason}
        </p>
      ) : null}

      {/* Benefits */}
      <ul className="mt-5 space-y-2.5">
        {BENEFITS.map((b) => (
          <li key={b.icon} className="flex items-center gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/12 text-[10px] text-accent">
              {b.icon}
            </span>
            <span className="text-[12px] text-fg-dim">{b.label}</span>
          </li>
        ))}
      </ul>

      {/* Actions */}
      <div className="mt-7 flex flex-col gap-2">
        <button
          type="button"
          className="luna-btn-primary w-full px-4 py-2.5"
          disabled={auth.loading || auth.googleSignInBusy || !auth.configured}
          onClick={() => void auth.signInWithGoogle()}
        >
          {auth.googleSignInBusy
            ? t('lunarAccount.signIn.googleBusy')
            : t('lunarAccount.signIn.google')}
        </button>
      </div>

      {auth.error ? (
        <p className="mt-3 text-[12px] text-red-400/90" role="alert">
          {auth.error}
        </p>
      ) : null}
    </div>
  )
}
