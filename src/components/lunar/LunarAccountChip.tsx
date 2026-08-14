import { useTranslation } from 'react-i18next'
import { useLunaAuth } from '../../features/auth/AuthProvider'

type Variant = 'activity' | 'toolbar' | 'compact'

type Props = {
  variant?: Variant
  onOpenAccount?: () => void
  className?: string
}

function CloudIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  )
}

export function LunarAccountChip({
  variant = 'toolbar',
  onOpenAccount,
  className = '',
}: Props) {
  const { t } = useTranslation()
  const auth = useLunaAuth()
  const connected = auth.isLunarConnected

  const label = connected
    ? auth.user?.displayName || auth.user?.email || t('lunarAccount.chip.accountFallback')
    : t('lunarAccount.chip.signIn')

  const sublabel = connected
    ? t('lunarAccount.chip.sublabelConnected')
    : t('lunarAccount.chip.sublabelSignIn')

  const handleClick = () => {
    if (onOpenAccount) onOpenAccount()
    else auth.openGate()
  }

  if (variant === 'activity') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`relative flex size-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
          connected
            ? 'bg-accent-muted text-accent shadow-sm'
            : 'text-fg-muted hover:bg-raised-hover hover:text-accent'
        } ${className}`}
        aria-label={
          connected
            ? t('lunarAccount.chip.activityAriaConnected')
            : t('lunarAccount.chip.activityAriaSignIn')
        }
        title={label}
      >
        <CloudIcon />
        <span
          className={`absolute bottom-1 right-1 size-2 rounded-full border border-sidebar ${
            connected ? 'bg-emerald-400' : 'bg-amber-400'
          }`}
          aria-hidden
        />
      </button>
    )
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
          connected
            ? 'border-accent bg-accent-muted text-accent'
            : 'border-line bg-raised text-fg-muted hover:border-accent hover:text-accent'
        } ${className}`}
        aria-label={label}
      >
        <span
          className={`size-1.5 shrink-0 rounded-full ${
            connected ? 'bg-emerald-400' : 'bg-amber-400'
          }`}
          aria-hidden
        />
        {connected
          ? t('lunarAccount.chip.compactLunar')
          : t('lunarAccount.chip.compactSignIn')}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex max-w-[14rem] items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
        connected
          ? 'border-accent bg-accent-muted hover:bg-accent-muted'
          : 'border-line-subtle bg-raised hover:border-accent hover:bg-accent-muted'
      } ${className}`}
      aria-label={label}
    >
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
          connected ? 'bg-accent-muted text-accent' : 'bg-raised text-fg-muted'
        }`}
      >
        <CloudIcon className={connected ? 'text-accent' : undefined} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-medium text-fg">
          {label}
        </span>
        <span className="block truncate text-[10px] text-fg-muted">{sublabel}</span>
      </span>
    </button>
  )
}
