import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

type Props = {
  onClose?: () => void
  size?: 'md' | 'lg' | 'xl'
  children: ReactNode
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

/** Modal central da Conta Lunar — portal, scrim leve, sem blur. */
export function LunarAccountModal({ onClose, size = 'md', children }: Props) {
  const { t } = useTranslation()
  const maxWidth =
    size === 'xl' ? 'max-w-3xl' : size === 'lg' ? 'max-w-2xl' : 'max-w-md'

  return createPortal(
    <div className="luna-account-overlay p-4 sm:p-8" role="presentation">
      {onClose ? (
        <button
          type="button"
          className="luna-account-overlay__backdrop cursor-default border-0 p-0"
          aria-label={t('lunarAccount.modal.closeOverlayAria')}
          onClick={onClose}
        />
      ) : (
        <div className="luna-account-overlay__backdrop" aria-hidden />
      )}
      <div
        className={`luna-dialog relative z-[1] w-full overflow-hidden ${maxWidth}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lunar-account-title"
      >
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="luna-modal-close absolute right-4 top-4 z-10"
            aria-label={t('lunarAccount.modal.closeAria')}
          >
            <CloseIcon />
          </button>
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  )
}
