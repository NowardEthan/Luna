import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PluginManifest } from '../../../../packages/luna-sdk/src'
import { pluginHost } from '../../../core/plugin/PluginHost'
import { addInstalledPlugin } from '../../../core/plugin/installRegistry'
import { eventBus } from '../../../core/events/EventBus'
import { requestConfirm } from '../../../lib/confirm'
import type { PreferencesSharedProps } from '../settingsSections'
import { filterAddons, type AddonListItem } from '../addonFilters'
import { AddonDetailPanel } from '../AddonDetailPanel'
import { Switch } from '../../../components/ui/Switch'
import {
  canPickPluginFromDisk,
  pickAndInstallPlugin,
} from '../../../lib/pluginInstallClient'
import { setAddonEnabled } from '../../../lib/installLunaPlugin'
import { LUNA_IDE_PLUGIN_ID } from '../../../plugins/luna-ide/constants'

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
  const { t } = useTranslation()
  const [plugins, setPlugins] = useState(toListItems)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [enabledOnly, setEnabledOnly] = useState(false)
  const [enableOnInstall, setEnableOnInstall] = useState(true)
  const [riskAck, setRiskAck] = useState(readRiskAcknowledged)
  const [busy, setBusy] = useState(false)
  const [installHint, setInstallHint] = useState<string | null>(null)

  const loadErrors = pluginHost.getLoadErrors()
  const canInstallFromDisk = canPickPluginFromDisk()

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
      eventBus.on('plugin:enabled-changed', bump),
      eventBus.on('plugin:installed', bump),
      eventBus.on('plugin:discover:complete', bump),
    ]
    return () => unsubs.forEach((u) => u())
  }, [refreshList])

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    setInstallHint(null)
    try {
      await setAddonEnabled(id, enabled)
      refreshList()
      if (enabled && id === LUNA_IDE_PLUGIN_ID) {
        setInstallHint(t('settings.addons.ide_enabled_hint'))
      }
    } catch (err) {
      setInstallHint(
        err instanceof Error ? err.message : t('settings.addons.toggle_error'),
      )
      refreshList()
    }
  }

  const handleInstall = async () => {
    if (!canInstallFromDisk) return
    setBusy(true)
    setInstallHint(null)
    try {
      const result = await pickAndInstallPlugin()
      if (!result.ok) {
        if ('canceled' in result && result.canceled) return
        setInstallHint(
          'error' in result ? result.error : t('settings.addons.install_canceled'),
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
        await setAddonEnabled(manifest.id, true)
        refreshList()
      } else if (enableOnInstall && !riskAck) {
        setInstallHint(t('settings.addons.install_confirm_risk'))
      }
    } catch (err) {
      setInstallHint(
        err instanceof Error ? err.message : t('settings.addons.install_failed'),
      )
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (item: AddonListItem) => {
    if (!pluginHost.canUninstall(item.manifest.id)) return
    const ok = await requestConfirm({
      title: t('settings.addons.uninstall_title'),
      message: t('settings.addons.uninstall_message', { name: item.manifest.name }),
      confirmLabel: t('settings.addons.uninstall_confirm'),
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
        err instanceof Error ? err.message : t('settings.addons.uninstall_failed'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col space-y-6">
      <header className="shrink-0 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-fg">{t('settings.section_addons_label', 'Add-ons')}</h2>
          <p className="mt-1 text-xs text-fg-muted">
            {t('settings.section_addons_desc', 'Plugins instalados')}
          </p>
        </div>
      </header>

      {!riskAck ? (
        <div className="luna-card flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-fg">{t('settings.addons.risk_ack')}</span>
            <span className="text-xs text-fg-muted mt-0.5">{t('settings.addons.warning')}</span>
          </div>
          <Switch
            checked={riskAck}
            disabled={disabled || busy}
            onChange={(c) => {
              if (c) {
                writeRiskAcknowledged()
                setRiskAck(true)
              }
            }}
          />
        </div>
      ) : null}

      <div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-line pb-4">
        <input
          type="search"
          placeholder={t('settings.addons.search_placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-[12rem] flex-1 rounded-xl border border-line bg-surface px-4 py-2 text-sm text-fg shadow-sm placeholder:text-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all"
          aria-label={t('settings.addons.search_aria')}
        />
        <div className="flex items-center gap-4">
          <Switch
            label={t('settings.addons.enabled_only', 'Apenas ativos')}
            checked={enabledOnly}
            onChange={(c) => setEnabledOnly(c)}
            className="text-xs"
          />
          <Switch
            label={t('settings.addons.enable_on_install', 'Ativar na instalação')}
            checked={enableOnInstall}
            onChange={(c) => setEnableOnInstall(c)}
            disabled={!canInstallFromDisk}
            className="text-xs"
          />
          <button
            type="button"
            className="luna-btn-secondary px-4 py-2 text-xs disabled:opacity-40"
            disabled={disabled || busy || !canInstallFromDisk}
            title={
              canInstallFromDisk
                ? t('settings.addons.install_title_disk')
                : t('settings.addons.install_title_electron')
            }
            onClick={() => void handleInstall()}
          >
            {t('settings.addons.install_from_disk')}
          </button>
          {onOpenMarketplace ? (
            <button
              type="button"
              className="luna-btn-primary px-4 py-2 text-xs"
              onClick={onOpenMarketplace}
            >
              {t('settings.addons.open_marketplace')}
            </button>
          ) : null}
        </div>
      </div>

      {installHint ? (
        <p className="luna-callout-warning shrink-0 text-ui" role="status">
          {installHint}
        </p>
      ) : null}

      {loadErrors.length > 0 ? (
        <ul className="luna-callout-danger shrink-0 space-y-1">
          {loadErrors.map((err) => (
            <li key={err.pluginId}>
              <strong>{err.pluginId}:</strong> {err.message}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(200px,280px)_1fr]">
        <ul className="luna-card min-h-0 divide-y divide-line overflow-y-auto !p-0">
          {filtered.length === 0 ? (
            <li className="px-3 py-4 text-ui text-fg-muted">
              {t('settings.addons.none_found')}
            </li>
          ) : (
            filtered.map((p) => {
              const isSelected = selectedId === p.manifest.id
              return (
                <li key={p.manifest.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-3 border-l-4 px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? 'border-accent bg-accent/5'
                        : 'border-transparent hover:bg-raised-hover'
                    }`}
                    onClick={() => setSelectedId(p.manifest.id)}
                  >
                    <div className="scale-[0.8] origin-left">
                      <Switch
                        checked={p.enabled}
                        disabled={
                          !riskAck || Boolean(p.loadError) || disabled || busy
                        }
                        onChange={() =>
                          void handleToggleEnabled(p.manifest.id, !p.enabled)
                        }
                      />
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ui font-medium">
                        {p.manifest.name}
                      </span>
                      <span className="block truncate text-[10px] text-fg-muted">
                        v{p.manifest.version}
                        {pluginHost.canUninstall(p.manifest.id)
                          ? t('settings.addons.installed_badge')
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
