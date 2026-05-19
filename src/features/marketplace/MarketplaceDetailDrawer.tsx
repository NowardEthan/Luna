import {
  MARKETPLACE_CATEGORY_LABELS,
  type MarketplaceListing,
} from '../../lib/marketplaceCatalog'
import { coverClassForListing } from './marketplaceCover'

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

export function MarketplaceDetailDrawer({
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
  if (!open || !item) return null

  const cover = coverClassForListing(item)
  const installLabel =
    item.install.type === 'disk'
      ? 'Seleccionar pasta…'
      : installed
        ? 'Reinstalar'
        : 'Instalar add-on'

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
        aria-label="Fechar detalhes"
        onClick={onClose}
      />
      <aside
        className="luna-marketplace-drawer fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-canvas shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes: ${item.name}`}
      >
        <div
          className={`relative h-44 shrink-0 bg-gradient-to-br ${cover}`}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.2),transparent_50%)]"
            aria-hidden
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/55"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
            {MARKETPLACE_CATEGORY_LABELS[item.category]}
          </p>
          <h2 className="mt-1 text-title font-semibold text-fg">{item.name}</h2>
          <p className="mt-0.5 text-ui text-fg-muted">
            {item.author} · v{item.version}
          </p>
          <p className="mt-4 text-body leading-relaxed text-fg-dim">
            {item.description}
          </p>

          {item.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
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

          {item.permissions.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
                Permissões
              </h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {item.permissions.map((perm) => (
                  <li
                    key={perm}
                    className="rounded-md bg-raised px-2 py-0.5 text-[10px] text-fg-dim ring-1 ring-line-subtle"
                  >
                    {perm}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {!riskAck ? (
            <label className="mt-5 flex items-start gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-[11px] text-fg-dim">
              <input
                type="checkbox"
                className="mt-0.5"
                disabled={busy}
                onChange={(e) => {
                  if (e.target.checked) onAcknowledgeRisk()
                }}
              />
              <span>
                Compreendo que add-ons executam código com as permissões
                declaradas no manifesto.
              </span>
            </label>
          ) : null}

          {statusHint ? (
            <p className="mt-3 text-ui text-amber-200/90 dark:text-amber-950" role="status">
              {statusHint}
            </p>
          ) : null}

          <div className="mt-auto flex flex-col gap-2 pt-6">
            <button
              type="button"
              className="luna-btn-primary w-full py-2.5 text-ui"
              disabled={busy || !canInstall || (item.install.type !== 'disk' && !riskAck)}
              onClick={onInstall}
            >
              {busy ? 'A instalar…' : installLabel}
            </button>
            {installed && onManageAddons ? (
              <button
                type="button"
                className="luna-btn-secondary w-full py-2"
                onClick={onManageAddons}
              >
                Gerir em Add-ons
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  )
}
