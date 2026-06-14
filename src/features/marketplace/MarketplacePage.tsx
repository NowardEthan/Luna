import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LunarAccountChip } from '../../components/lunar/LunarAccountChip'
import { useLunaAuth } from '../auth/AuthProvider'
import { BRAND_APP_NAME } from '../../brand'
import {
  marketplaceCategoryLabel,
  type MarketplaceCategoryId,
} from '../../lib/marketplaceCatalog'
import { readLunaCloudConfig } from '../../lib/lunaCloud'
import { lunaPublisherFromUser } from '../../lib/marketplacePublisherAccount'
import { isLunaServerBridgeAvailable } from '../../lib/lunaServer/config'
import { canPickPluginFromDisk } from '../../lib/pluginInstallClient'
import { MarketplaceDetailModal } from './MarketplaceDetailModal'
import { MarketplacePublishModal } from './MarketplacePublishModal'
import { MarketplaceProductCard } from './MarketplaceProductCard'
import {
  MARKETPLACE_CATALOG_URL_OVERRIDE_KEY,
  useMarketplace,
} from './useMarketplace'

type Props = {
  onManageAddons?: () => void
}

export function MarketplacePage({ onManageAddons }: Props) {
  const { t } = useTranslation()
  const auth = useLunaAuth()
  const mp = useMarketplace()
  const [publishOpen, setPublishOpen] = useState(false)
  const detailOpen = Boolean(mp.selectedId && mp.selected)
  const cloud = readLunaCloudConfig()
  const serverReady = cloud.firebase && isLunaServerBridgeAvailable()
  const lunarAccount =
    auth.user && !auth.user.isAnonymous ? lunaPublisherFromUser(auth.user) : null

  const categoryPills = useMemo(() => {
    const all: Array<{ id: MarketplaceCategoryId | 'all'; label: string }> = [
      { id: 'all', label: t('marketplace.category.all') },
      ...mp.categories.map((id) => ({
        id,
        label: marketplaceCategoryLabel(id),
      })),
    ]
    return all
  }, [mp.categories, t])

  const featured = useMemo(
    () => mp.catalog.filter((i) => i.featured && i.install.type !== 'disk'),
    [mp.catalog],
  )

  const exploreItems = useMemo(() => {
    if (mp.query.trim() || mp.category !== 'all') return mp.filtered
    const featuredIds = new Set(featured.map((i) => i.id))
    return mp.filtered.filter((i) => !featuredIds.has(i.id))
  }, [mp.filtered, mp.query, mp.category, featured])

  useEffect(() => {
    void mp.refreshCatalog()
  }, [mp.refreshCatalog])

  return (
    <div className="luna-marketplace flex h-full min-h-0 flex-col overflow-hidden bg-canvas">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-5 py-3 sm:px-8">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">
            {t('marketplace.page.storeBadge')}
          </p>
          <h1 className="truncate text-title font-semibold text-fg">
            {t('marketplace.page.title')}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LunarAccountChip
            variant="compact"
            onOpenAccount={() => auth.openGate()}
          />
          {onManageAddons ? (
            <button
              type="button"
              className="luna-btn-secondary hidden px-3 py-1.5 text-ui sm:inline-flex"
              onClick={onManageAddons}
            >
              {t('marketplace.page.installedAddons')}
            </button>
          ) : null}
          {cloud.firebase ? (
            <button
              type="button"
              className="luna-btn-secondary px-3 py-1.5 text-ui"
              onClick={() => setPublishOpen(true)}
            >
              {t('marketplace.page.publishAddon')}
            </button>
          ) : null}
          {canPickPluginFromDisk() ? (
            <button
              type="button"
              className="luna-btn-primary px-3 py-1.5 text-ui"
              disabled={mp.busy}
              onClick={() => void mp.installFromDisk()}
            >
              {t('marketplace.page.installFolder')}
            </button>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="border-b border-line px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-ui text-fg-muted">
              {t('marketplace.page.heroSubtitle', { appName: BRAND_APP_NAME })}
            </p>
            <h2 className="mt-2 text-[1.65rem] font-semibold leading-tight tracking-tight text-fg sm:text-[2rem]">
              {t('marketplace.page.heroTitle')}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-body text-fg-dim">
              {t('marketplace.page.heroBody')}
            </p>

            <div className="luna-marketplace-search mx-auto mt-8 flex max-w-2xl items-center gap-0 rounded-full border border-accent bg-surface p-1 shadow-[0_0_0_1px_rgba(94,179,246,0.12),0_8px_32px_rgba(0,0,0,0.25)]">
              <span className="pl-4 text-fg-muted" aria-hidden>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="stroke-current"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="search"
                value={mp.query}
                onChange={(e) => mp.setQuery(e.target.value)}
                placeholder={t('marketplace.page.searchPlaceholder')}
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-body text-fg placeholder:text-fg-muted focus:outline-none"
                aria-label={t('marketplace.page.searchAria')}
              />
              <button
                type="button"
                className="luna-btn-primary mr-0.5 shrink-0 rounded-full px-5 py-2"
                onClick={() => {
                  /* filtro já é reactivo */
                }}
              >
                {t('marketplace.page.searchButton')}
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {categoryPills.map((pill) => {
                const active = mp.category === pill.id
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => mp.setCategory(pill.id)}
                    className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition ${
                      active
                        ? 'bg-accent text-accent-fg shadow-sm'
                        : 'bg-raised text-fg-dim ring-1 ring-line hover:bg-raised-hover hover:text-fg'
                    }`}
                  >
                    {pill.label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {featured.length > 0 && !mp.query && mp.category === 'all' ? (
          <section className="px-5 py-8 sm:px-8">
            <div className="mx-auto max-w-6xl">
              <h3 className="mb-4 text-ui font-semibold text-fg-dim">
                {t('marketplace.page.featured')}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((item) => (
                  <MarketplaceProductCard
                    key={item.id}
                    item={item}
                    installed={mp.isInstalled(item)}
                    onSelect={() => mp.setSelectedId(item.id)}
                  />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="px-5 pb-12 pt-2 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4 flex items-end justify-between gap-2">
              <h3 className="text-ui font-semibold text-fg-dim">
                {mp.query
                  ? t('marketplace.page.results', { count: mp.filtered.length })
                  : t('marketplace.page.explore')}
              </h3>
              <span className="text-[10px] text-fg-muted">
                {mp.catalogLoading
                  ? t('marketplace.page.catalogLoading')
                  : mp.catalogSource === 'remote'
                    ? t('marketplace.page.catalogRemote')
                    : t('marketplace.page.catalogLocal')}
              </span>
            </div>
            {exploreItems.length === 0 && !mp.query && mp.category === 'all' && featured.length > 0 ? (
              <p className="luna-empty text-ui">
                {t('marketplace.page.allFeaturedListed')}
              </p>
            ) : exploreItems.length === 0 ? (
              <div className="luna-empty">
                <p className="text-ui font-medium text-fg-dim">
                  {mp.catalog.length === 0
                    ? t('marketplace.page.emptyPublished')
                    : t('marketplace.page.emptySearch')}
                </p>
                <p className="mt-2 text-ui text-fg-muted">
                  {mp.catalog.length === 0
                    ? (mp.catalogHint ?? t('marketplace.page.emptyPublishedHint'))
                    : t('marketplace.page.emptySearchHint')}
                </p>
                {mp.catalog.length === 0 && canPickPluginFromDisk() ? (
                  <button
                    type="button"
                    className="luna-btn-primary mt-4 px-4 py-2"
                    disabled={mp.busy}
                    onClick={() => void mp.installFromDisk()}
                  >
                    {t('marketplace.page.installFromDisk')}
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {exploreItems.map((item) => (
                  <MarketplaceProductCard
                    key={item.id}
                    item={item}
                    installed={mp.isInstalled(item)}
                    onSelect={() => mp.setSelectedId(item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <MarketplacePublishModal
        open={publishOpen}
        serverReady={serverReady}
        needsSignIn={cloud.firebase && !auth.isLunarConnected}
        accountAllowed={auth.entitlements.marketplacePublish}
        lunarAccount={lunarAccount}
        onClose={() => setPublishOpen(false)}
        onSignIn={() => auth.openGate()}
        onPublished={(catalogUrl) => {
          try {
            localStorage.setItem(MARKETPLACE_CATALOG_URL_OVERRIDE_KEY, catalogUrl)
          } catch {
            /* ignore */
          }
          void mp.refreshCatalog(catalogUrl)
        }}
      />

      <MarketplaceDetailModal
        item={mp.selected}
        open={detailOpen}
        installed={mp.selected ? mp.isInstalled(mp.selected) : false}
        canInstall={
          mp.canInstallDesktop || mp.selected?.install.type === 'disk'
        }
        busy={mp.busy}
        riskAck={mp.riskAck}
        statusHint={mp.statusHint}
        onClose={() => {
          mp.setSelectedId(null)
          mp.clearStatus()
        }}
        onInstall={() => mp.selected && void mp.installListing(mp.selected)}
        onAcknowledgeRisk={mp.acknowledgeRisk}
        onManageAddons={onManageAddons}
      />
    </div>
  )
}
