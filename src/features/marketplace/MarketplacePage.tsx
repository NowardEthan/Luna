import { useMemo } from 'react'
import { LunarAccountChip } from '../../components/lunar/LunarAccountChip'
import { useLunaAuth } from '../auth/AuthProvider'
import { BRAND_APP_NAME } from '../../brand'
import {
  MARKETPLACE_CATEGORY_LABELS,
  type MarketplaceCategoryId,
} from '../../lib/marketplaceCatalog'
import { MarketplaceDetailDrawer } from './MarketplaceDetailDrawer'
import { MarketplaceProductCard } from './MarketplaceProductCard'
import { useMarketplace } from './useMarketplace'

type Props = {
  onManageAddons?: () => void
}

export function MarketplacePage({ onManageAddons }: Props) {
  const auth = useLunaAuth()
  const mp = useMarketplace()
  const drawerOpen = Boolean(mp.selectedId && mp.selected)

  const categoryPills = useMemo(() => {
    const all: Array<{ id: MarketplaceCategoryId | 'all'; label: string }> = [
      { id: 'all', label: 'Todos' },
      ...mp.categories.map((id) => ({
        id,
        label: MARKETPLACE_CATEGORY_LABELS[id],
      })),
    ]
    return all
  }, [mp.categories])

  const featured = useMemo(
    () => mp.catalog.filter((i) => i.featured && i.install.type !== 'disk'),
    [mp.catalog],
  )

  return (
    <div className="luna-marketplace flex h-full min-h-0 flex-col overflow-hidden bg-canvas">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line/80 px-5 py-3 sm:px-8">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">
            Luna Store
          </p>
          <h1 className="truncate text-title font-semibold text-fg">
            Marketplace
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
              Add-ons instalados
            </button>
          ) : null}
          {window.plugins?.pickAndInstall ? (
            <button
              type="button"
              className="luna-btn-primary px-3 py-1.5 text-ui"
              disabled={mp.busy}
              onClick={() => void mp.installFromDisk()}
            >
              Instalar pasta
            </button>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="border-b border-line/60 px-5 py-10 sm:px-8 sm:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-ui text-fg-muted">
              Extensões para {BRAND_APP_NAME}
            </p>
            <h2 className="mt-2 text-[1.65rem] font-semibold leading-tight tracking-tight text-fg sm:text-[2rem]">
              Torna a Luna à tua medida
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-body text-fg-dim">
              Ferramentas do agente, painéis, comandos e integrações — instalas
              em segundos e geres tudo num só lugar.
            </p>

            <div className="luna-marketplace-search mx-auto mt-8 flex max-w-2xl items-center gap-0 rounded-full border border-accent/40 bg-surface/90 p-1 shadow-[0_0_0_1px_rgba(94,179,246,0.12),0_8px_32px_rgba(0,0,0,0.25)]">
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
                placeholder="Pesquisar add-ons, autores ou etiquetas…"
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-body text-fg placeholder:text-fg-muted focus:outline-none"
                aria-label="Pesquisar na marketplace"
              />
              <button
                type="button"
                className="mr-0.5 shrink-0 rounded-full bg-accent px-5 py-2 text-ui font-medium text-accent-fg transition hover:brightness-110"
                onClick={() => {
                  /* filtro já é reactivo */
                }}
              >
                Pesquisar
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
                        : 'bg-raised/80 text-fg-dim ring-1 ring-line hover:bg-raised-hover hover:text-fg'
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
                Em destaque
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
                  ? `Resultados (${mp.filtered.length})`
                  : 'Explorar'}
              </h3>
              <span className="text-[10px] text-fg-muted">
                Catálogo local · v1
              </span>
            </div>
            {mp.filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
                <p className="text-ui font-medium text-fg-dim">
                  {mp.catalog.length === 0
                    ? 'Ainda não há add-ons publicados'
                    : 'Nenhum add-on corresponde à pesquisa'}
                </p>
                <p className="mt-2 text-ui text-fg-muted">
                  {mp.catalog.length === 0
                    ? 'Instala uma pasta local com plugin.json ou aguarda novos pacotes no catálogo.'
                    : 'Tenta outra palavra ou categoria.'}
                </p>
                {mp.catalog.length === 0 && window.plugins?.pickAndInstall ? (
                  <button
                    type="button"
                    className="luna-btn-primary mt-4 px-4 py-2"
                    disabled={mp.busy}
                    onClick={() => void mp.installFromDisk()}
                  >
                    Instalar do disco
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {mp.filtered.map((item) => (
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

      <MarketplaceDetailDrawer
        item={mp.selected}
        open={drawerOpen}
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
