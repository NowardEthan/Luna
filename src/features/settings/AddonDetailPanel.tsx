import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AddonListItem } from './addonFilters'
import { AddonSchemaForm } from './AddonSchemaForm'
import { pluginHost } from '../../core/plugin/PluginHost'
import { pluginSettingsRegistry } from '../../core/registry/PluginSettingsRegistry'
import { pluginShortcutRegistry } from '../../core/registry/PluginShortcutRegistry'
import { eventBus } from '../../core/events/EventBus'

type Props = {
  item: AddonListItem | null
  disabled?: boolean
  busy?: boolean
  onUninstall: (item: AddonListItem) => void
  onToggleEnabled: (id: string, enabled: boolean) => void
  riskAck: boolean
}

export function AddonDetailPanel({
  item,
  disabled,
  busy,
  onUninstall,
  onToggleEnabled,
  riskAck,
}: Props) {
  const { t } = useTranslation()
  const [settingsTick, setSettingsTick] = useState(0)

  useEffect(() => {
    const bump = () => setSettingsTick((n) => n + 1)
    const unsubs = [
      eventBus.on('plugin:activated', bump),
      eventBus.on('plugin:deactivated', bump),
      eventBus.on('plugin:settings:registered', bump),
      eventBus.on('plugin:settings:changed', bump),
      eventBus.on('plugin:shortcut:registered', bump),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  if (!item) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-lg border border-dashed border-line bg-surface p-6 text-center text-ui text-fg-muted">
        {t('settings.addons.detail_empty')}
      </div>
    )
  }

  const customPanel = pluginSettingsRegistry.get(item.manifest.id)
  const shortcuts = pluginShortcutRegistry.listByPlugin(item.manifest.id)
  const canUninstall = pluginHost.canUninstall(item.manifest.id)
  const canToggle = riskAck && !item.loadError && !disabled && !busy
  void settingsTick

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-surface">
      <header className="shrink-0 border-b border-line px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-title font-semibold text-fg">
              {item.manifest.name}
              <span className="ml-1 text-ui font-normal text-fg-muted">
                v{item.manifest.version}
              </span>
            </h3>
            <p className="mt-0.5 text-ui text-fg-muted">
              {item.manifest.description ?? item.manifest.id}
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-ui text-fg-dim">
            <input
              type="checkbox"
              className="size-3.5 rounded border-line"
              checked={item.enabled}
              disabled={!canToggle}
              onChange={() =>
                onToggleEnabled(item.manifest.id, !item.enabled)
              }
            />
            {t('settings.addons.active')}
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {canUninstall ? (
            <button
              type="button"
              className="rounded-lg border border-line bg-danger-muted px-3 py-1.5 text-ui text-danger hover:bg-raised-hover disabled:opacity-40"
              disabled={disabled || busy}
              onClick={() => onUninstall(item)}
            >
              {t('settings.addons.uninstall_btn')}
            </button>
          ) : (
            <span className="rounded-lg border border-line px-3 py-1.5 text-[10px] text-fg-muted">
              {t('settings.addons.bundled')}
            </span>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {item.loadError ? (
          <p className="luna-callout-danger text-ui">
            {item.loadError}
          </p>
        ) : null}

        {item.manifest.settings?.fields?.length ? (
          <AddonSchemaForm
            pluginId={item.manifest.id}
            schema={item.manifest.settings}
            disabled={disabled || busy}
            onChange={() => setSettingsTick((n) => n + 1)}
          />
        ) : null}

        {customPanel ? (
          <div className="space-y-2">
            <p className="text-caption font-medium uppercase tracking-wide text-fg-muted">
              {customPanel.title ?? t('settings.addons.custom_panel')}
            </p>
            {!item.enabled ? (
              <p className="text-[11px] text-warning">
                {t('settings.addons.custom_panel_enable')}
              </p>
            ) : null}
            <div className="rounded-lg border border-line bg-canvas p-3">
              {customPanel.render()}
            </div>
          </div>
        ) : null}

        {shortcuts.length > 0 ? (
          <div className="space-y-2">
            <p className="text-caption font-medium uppercase tracking-wide text-fg-muted">
              {t('settings.addons.shortcuts')}
            </p>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {shortcuts.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-ui"
                >
                  <span className="text-fg">{s.label}</span>
                  <kbd className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">
                    {s.keys}
                  </kbd>
                </li>
              ))}
            </ul>
            {!item.enabled ? (
              <p className="text-[10px] text-fg-muted">
                {t('settings.addons.shortcuts_disabled')}
              </p>
            ) : null}
          </div>
        ) : null}

        <details className="rounded-lg border border-line px-3 py-2 text-[11px] text-fg-dim">
          <summary className="cursor-pointer text-ui text-fg-muted">
            {t('settings.addons.tech_info')}
          </summary>
          <p className="mt-2">
            <strong>{t('settings.addons.id_label')}</strong> {item.manifest.id}
          </p>
          <p className="mt-1">
            <strong>{t('settings.addons.origin_label')}</strong>{' '}
            {item.origin === 'project'
              ? t('settings.addons.origin_bundled')
              : t('settings.addons.origin_disk')}
          </p>
          {item.installPath ? (
            <p className="mt-1 break-all">
              <strong>{t('settings.addons.folder_label')}</strong> {item.installPath}
            </p>
          ) : null}
          {item.manifest.permissions?.length ? (
            <p className="mt-1">
              <strong>{t('settings.addons.permissions_label')}</strong>{' '}
              {item.manifest.permissions.join(', ')}
            </p>
          ) : null}
        </details>
      </div>
    </div>
  )
}
