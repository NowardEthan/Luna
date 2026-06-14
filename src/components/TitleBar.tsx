import type { CSSProperties } from 'react'
import { BRAND_APP_NAME } from '../brand'
import { useTranslation } from 'react-i18next'

function drag(region: 'drag' | 'no-drag'): CSSProperties {
  return { WebkitAppRegion: region } as CSSProperties
}

function WindowControls() {
  const { t } = useTranslation()
  const api = window.electron
  if (!api) return null

  const btnClass =
    'flex h-full w-10 items-center justify-center text-fg-muted transition-colors hover:bg-raised-hover hover:text-fg-dim active:bg-raised'

  return (
    <div className="flex h-full" style={drag('no-drag')}>
      <button
        type="button"
        className={btnClass}
        aria-label={t('titleBar.minimize')}
        onClick={() => void api.minimize()}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className="stroke-current"
          strokeWidth="1.2"
          aria-hidden
        >
          <line x1="0" y1="5" x2="10" y2="5" />
        </svg>
      </button>
      <button
        type="button"
        className={btnClass}
        aria-label={t('titleBar.maximize')}
        onClick={() => void api.maximizeToggle()}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className="stroke-current"
          strokeWidth="1.2"
          aria-hidden
        >
          <rect x="1" y="1" width="8" height="8" rx="0.5" />
        </svg>
      </button>
      <button
        type="button"
        className="flex h-full w-10 items-center justify-center text-fg-muted transition-colors hover:bg-red-600/20 hover:text-fg active:bg-red-600/28"
        aria-label={t('titleBar.close')}
        onClick={() => void api.close()}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className="stroke-current"
          strokeWidth="1.2"
          aria-hidden
        >
          <line x1="1" y1="1" x2="9" y2="9" />
          <line x1="9" y1="1" x2="1" y2="9" />
        </svg>
      </button>
    </div>
  )
}

export function TitleBar() {
  return (
    <header
      className="flex h-9 shrink-0 items-stretch border-b border-line-subtle bg-sidebar"
      style={drag('drag')}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
        <span className="truncate text-[12px] font-medium tracking-tight text-fg-dim">
          {BRAND_APP_NAME}
        </span>
      </div>
      <WindowControls />
    </header>
  )
}
