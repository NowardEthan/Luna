import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PluginManifest } from '../../../../packages/luna-sdk/src'
import { pluginHost } from '../../../core/plugin/PluginHost'
import { addInstalledPlugin } from '../../../core/plugin/installRegistry'
import { eventBus } from '../../../core/events/EventBus'
import { requestConfirm } from '../../../lib/confirm'
import type { PreferencesSharedProps } from '../settingsSections'
import { filterAddons, type AddonListItem } from '../addonFilters'
import { AddonDetailPanel } from '../AddonDetailPanel'

const RISK_ACK_KEY = 'luna-plugins-risk-ack'

function readRiskAcknowledged(): boolean {
  try {
    return localStorage.getItem(RISK_ACK_KEY) === '1'
  } catch {
    return false
  }
}

function writeRiskAcknowledged(): void {
  try {
    localStorage.setItem(RISK_ACK_KEY, '1')
  } catch {
    /* ignore */
  }
}

function toListItems(): AddonListItem[] {
  return pluginHost.list().map((p) => ({
    ...p,
    origin: pluginHost.getOrigin(p.manifest.id),
    installPath: pluginHost.getInstallPath(p.manifest.id),
  }))
}

export function AddonsSection({
  disabled,
  onOpenMarketplace,
}: PreferencesSharedProps) {
  const [plugins, setPlugins] = useState(toListItems)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [enabledOnly, setEnabledOnly] = useState(false)
  const [enableOnInstall, setEnableOnInstall] = useState(true)
  const [riskAck, setRiskAck] = useState(readRiskAcknowledged)
  const [busy, setBusy] = useState(false)
  const [installHint, setInstallHint] = useState<string | null>(null)

  const loadErrors = pluginHost.getLoadErrors()
  const canInstallFromDisk = Boolean(window.plugins?.pickAndInstall)

  const filtered = useMemo(
    () => filterAddons(plugins, query, enabledOnly),
    [plugins, query, enabledOnly],
  )

  const selected = useMemo(
    () => filtered.find((p) => p.manifest.id === selectedId) ?? null,
    [filtered, selectedId],
  )

  const refreshList = useCallback(() => {
    const next = toListItems()
    setPlugins(next)
    if (selectedId && !next.some((p) => p.manifest.id === selectedId)) {
      setSelectedId(null)
    }
  }, [selectedId])

  useEffect(() => {
    const bump = () => refreshList()
    const unsubs = [
      eventBus.on('plugin:activated', bump),
      eventBus.on('plugin:deactivated', bump),
      eventBus.on('plugin:discover:complete', bump),
    ]
    return () => unsubs.forEach((u) => u())
  }, [refreshList])

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await pluginHost.setEnabled(id, enabled)
      refreshList()
    } catch (err) {
      setInstallHint(
        err instanceof Error ? err.message : 'Não foi possível alterar o add-on.',
      )
    }
  }

  const handleInstall = async () => {
    if (!window.plugins?.pickAndInstall) return
    setBusy(true)
    setInstallHint(null)
    try {
      const result = await window.plugins.pickAndInstall()
      if (!result.ok) {
        if ('canceled' in result && result.canceled) return
        setInstallHint(
          'error' in result ? result.error : 'Instalação cancelada.',
        )
        return
      }
      const manifest: PluginManifest = {
        ...result.manifest,
        version: result.manifest.version ?? '1.0.0',
        permissions: result.manifest.permissions as PluginManifest['permissions'],
      }
      addInstalledPlugin({
        id: manifest.id,
        rootPath: result.rootPath,
        manifest,
        installedAt: result.installedAt,
      })
      if (result.needsReload) {
        window.location.reload()
        return
      }
      await pluginHost.refresh()
      refreshList()
      setSelectedId(manifest.id)
      if (enableOnInstall && riskAck) {
        await pluginHost.setEnabled(manifest.id, true)
        refreshList()
      } else if (enableOnInstall && !riskAck) {
        setInstallHint(
          'Add-on instalado. Confirme o aviso de segurança antes de activar.',
        )
      }
    } catch (err) {
      setInstallHint(
        err instanceof Error ? err.message : 'Falha ao instalar add-on.',
      )
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (item: AddonListItem) => {
    if (!pluginHost.canUninstall(item.manifest.id)) return
    const ok = await requestConfirm({
      title: 'Desinstalar add-on',
      message: `Desinstalar «${item.manifest.name}»? A pasta será apagada do disco.`,
      confirmLabel: 'Desinstalar',
      destructive: true,
    })
    if (!ok) return
    setBusy(true)
    try {
      await pluginHost.uninstall(item.manifest.id)
      setSelectedId(null)
      refreshList()
    } catch (err) {
      setInstallHint(
        err instanceof Error ? err.message : 'Não foi possível desinstalar.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col space-y-4">
      <header className="shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-title font-semibold text-fg">Add-ons</h2>
            <p className="mt-1 text-ui text-fg-muted">
              Seleccione um add-on para configurar propriedades, atalhos e
              desinstalar.
            </p>
          </div>
          {onOpenMarketplace ? (
            <button
              type="button"
              className="luna-btn-secondary shrink-0 px-3 py-1.5 text-ui"
              onClick={onOpenMarketplace}
            >
              Abrir Marketplace
            </button>
          ) : null}
        </div>
      </header>

      <div className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/90">
        Plugins executam código com as permissões declaradas no manifesto.
        Active apenas extensões em que confia.
      </div>

      {!riskAck ? (
        <label className="flex shrink-0 items-start gap-2 rounded-lg border border-line px-3 py-2 text-ui text-fg-dim">
          <input
            type="checkbox"
            className="mt-0.5"
            disabled={disabled || busy}
            onChange={(e) => {
              if (e.target.checked) {
                writeRiskAcknowledged()
                setRiskAck(true)
              }
            }}
          />
          <span>
            Compreendo que add-ons de terceiros podem aceder a dados locais
            conforme as permissões declaradas.
          </span>
        </label>
      ) : null}

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line pb-3">
        <input
          type="search"
          placeholder="Pesquisar add-ons…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-[10rem] flex-1 rounded-lg border border-line bg-raised px-3 py-1.5 text-ui text-fg placeholder:text-fg-muted focus:border-accent/50 focus:outline-none"
          aria-label="Pesquisar add-ons"
        />
        <label className="flex items-center gap-1.5 text-ui text-fg-dim">
          <input
            type="checkbox"
            checked={enabledOnly}
            onChange={(e) => setEnabledOnly(e.target.checked)}
          />
          Só activos
        </label>
        <label className="flex items-center gap-1.5 text-ui text-fg-dim">
          <input
            type="checkbox"
            checked={enableOnInstall}
            onChange={(e) => setEnableOnInstall(e.target.checked)}
            disabled={!canInstallFromDisk}
          />
          Activar ao instalar
        </label>
        <button
          type="button"
          className="luna-btn-secondary shrink-0 px-3 py-1.5 text-ui"
          disabled={disabled || busy || !canInstallFromDisk}
          title={
            canInstallFromDisk
              ? 'Seleccionar pasta com plugin.json'
              : 'Disponível na aplicação desktop (Electron)'
          }
          onClick={() => void handleInstall()}
        >
          Instalar do disco
        </button>
      </div>

      {installHint ? (
        <p className="shrink-0 text-ui text-amber-200/90" role="status">
          {installHint}
        </p>
      ) : null}

      {loadErrors.length > 0 ? (
        <ul className="shrink-0 space-y-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-100/90">
          {loadErrors.map((err) => (
            <li key={err.pluginId}>
              <strong>{err.pluginId}:</strong> {err.message}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[minmax(200px,280px)_1fr]">
        <ul className="min-h-0 overflow-y-auto rounded-lg border border-line divide-y divide-line">
          {filtered.length === 0 ? (
            <li className="px-3 py-4 text-ui text-fg-muted">
              Nenhum add-on encontrado.
            </li>
          ) : (
            filtered.map((p) => {
              const isSelected = selectedId === p.manifest.id
              return (
                <li key={p.manifest.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-accent-muted/80 text-accent'
                        : 'hover:bg-white/[0.04] text-fg'
                    }`}
                    onClick={() => setSelectedId(p.manifest.id)}
                  >
                    <input
                      type="checkbox"
                      className="shrink-0"
                      checked={p.enabled}
                      disabled={
                        !riskAck || Boolean(p.loadError) || disabled || busy
                      }
                      onClick={(e) => e.stopPropagation()}
                      onChange={() =>
                        void handleToggleEnabled(p.manifest.id, !p.enabled)
                      }
                      aria-label={
                        p.enabled ? 'Desactivar' : 'Activar'
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ui font-medium">
                        {p.manifest.name}
                      </span>
                      <span className="block truncate text-[10px] opacity-80">
                        v{p.manifest.version}
                        {pluginHost.canUninstall(p.manifest.id)
                          ? ' · instalado'
                          : ''}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })
          )}
        </ul>

        <AddonDetailPanel
          item={selected}
          disabled={disabled}
          busy={busy}
          riskAck={riskAck}
          onUninstall={(item) => void handleRemove(item)}
          onToggleEnabled={(id, en) => void handleToggleEnabled(id, en)}
        />
      </div>
    </div>
  )
}
