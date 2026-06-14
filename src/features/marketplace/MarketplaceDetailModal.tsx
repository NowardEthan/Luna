import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  marketplaceCategoryLabel,
  type MarketplaceListing,
} from '../../lib/marketplaceCatalog'
import { MarketplaceListingArt } from './MarketplaceListingArt'
import { MarketplaceListingProfileView } from './MarketplaceListingProfileView'

type Props = {
  item: MarketplaceListing | null
  open: boolean
  installed: boolean
  canInstall: boolean
  busy: boolean
  riskAck: boolean
  statusHint: string | null
  onClose: () => void
  onInstall: () => void
  onAcknowledgeRisk: () => void
  onManageAddons?: () => void
}

export function MarketplaceDetailModal({
  item,
  open,
  installed,
  canInstall,
  busy,
  riskAck,
  statusHint,
  onClose,
  onInstall,
  onAcknowledgeRisk,
  onManageAddons,
}: Props) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !item) return null

  const profile = item.profile
  const installLabel =
    item.install.type === 'disk'
      ? t('marketplace.detail.pickFolder')
      : installed
        ? t('marketplace.detail.reinstall')
        : t('marketplace.detail.install')

  return (
    <div
      className="luna-overlay-scrim fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="marketplace-addon-title"
        className="luna-dialog luna-marketplace-modal flex max-h-[min(92vh,52rem)] w-full max-w-3xl flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="relative isolate shrink-0 overflow-hidden border-b border-line-subtle bg-[#06060c]">
          <div className="relative h-36 w-full sm:h-40">
            <MarketplaceListingArt item={item} variant="modal" className="absolute inset-0" />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 via-black/25 to-transparent sm:h-28"
              aria-hidden
            />
            <button
              type="button"
              onClick={onClose}
              className="luna-modal-close absolute right-3 top-3 z-10"
              aria-label={t('marketplace.detail.closeAria')}
            >
              ✕
            </button>
            <div className="absolute left-5 right-14 top-3 z-[1] sm:left-6 sm:top-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                {marketplaceCategoryLabel(item.category)}
              </p>
              <h2
                id="marketplace-addon-title"
                className="text-lg font-semibold tracking-tight text-white drop-shadow-sm sm:text-xl"
              >
                {item.name}
              </h2>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-raised px-2 py-0.5 text-[11px] font-medium text-fg-dim ring-1 ring-line-subtle">
                v{item.version}
              </span>
              {item.trusted ? (
                <span className="rounded-md bg-accent-muted px-2 py-0.5 text-[10px] font-semibold text-accent">
                  {t('marketplace.detail.verified')}
                </span>
              ) : null}
              {installed ? (
                <span className="rounded-md bg-success-muted px-2 py-0.5 text-[10px] font-semibold text-success">
                  {t('marketplace.detail.installed')}
                </span>
              ) : null}
            </div>

            <p className="text-body leading-relaxed text-fg-dim">{item.description}</p>

            {item.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-raised px-2.5 py-0.5 text-[10px] text-fg-dim ring-1 ring-line"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            {profile ? (
              <MarketplaceListingProfileView item={item} profile={profile} />
            ) : null}

            {item.permissions.length > 0 ? (
              <section className="border-t border-line-subtle pt-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
                  {t('marketplace.detail.permissionsTitle')}
                </h3>
                <p className="mt-0.5 text-[11px] text-fg-muted">
                  {t('marketplace.detail.permissionsHint')}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {item.permissions.map((perm) => (
                    <li
                      key={perm}
                      className="rounded-md bg-raised px-2 py-0.5 text-[10px] font-mono text-fg-dim ring-1 ring-line-subtle"
                    >
                      {perm}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {(item.repositoryUrl || item.homepageUrl) ? (
              <section className="flex flex-wrap gap-4 border-t border-line-subtle pt-4 text-ui">
                {item.homepageUrl ? (
                  <a
                    href={item.homepageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {t('marketplace.detail.homepage')}
                  </a>
                ) : null}
                {item.repositoryUrl ? (
                  <a
                    href={item.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-fg-dim hover:text-accent"
                  >
                    {t('marketplace.detail.repository')}
                  </a>
                ) : null}
              </section>
            ) : null}
          </div>
        </div>

        <footer className="shrink-0 border-t border-line bg-canvas px-5 py-4 sm:px-6">
          {!riskAck ? (
            <label className="mb-3 flex items-start gap-2 rounded-xl border border-warning bg-warning-muted px-3 py-2.5 text-[11px] leading-snug text-fg-dim">
              <input
                type="checkbox"
                className="mt-0.5"
                disabled={busy}
                onChange={(e) => {
                  if (e.target.checked) onAcknowledgeRisk()
                }}
              />
              <span>
                {t('marketplace.detail.riskAck')}
              </span>
            </label>
          ) : null}

          {statusHint ? (
            <p className="mb-3 text-ui text-warning" role="status">
              {statusHint}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {installed && onManageAddons ? (
              <button
                type="button"
                className="luna-btn-secondary order-2 w-full py-2.5 text-ui sm:order-1 sm:w-auto sm:min-w-[11rem]"
                onClick={onManageAddons}
              >
                {t('marketplace.detail.manageAddons')}
              </button>
            ) : null}
            <button
              type="button"
              className="luna-btn-primary order-1 w-full py-2.5 text-ui sm:order-2 sm:min-w-[12rem]"
              disabled={busy || !canInstall || (item.install.type !== 'disk' && !riskAck)}
              onClick={onInstall}
            >
              {busy ? t('marketplace.detail.installing') : installLabel}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
