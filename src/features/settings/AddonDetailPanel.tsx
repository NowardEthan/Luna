import { useEffect, useState } from 'react'
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
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-lg border border-dashed border-line p-6 text-center text-ui text-fg-muted">
        Seleccione um add-on na lista para ver propriedades, atalhos e opções de
        desinstalação.
      </div>
    )
  }

  const customPanel = pluginSettingsRegistry.get(item.manifest.id)
  const shortcuts = pluginShortcutRegistry.listByPlugin(item.manifest.id)
  const canUninstall = pluginHost.canUninstall(item.manifest.id)
  const canToggle = riskAck && !item.loadError && !disabled && !busy
  void settingsTick

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-surface/40">
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
              checked={item.enabled}
              disabled={!canToggle}
              onChange={() =>
                onToggleEnabled(item.manifest.id, !item.enabled)
              }
            />
            Activo
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {canUninstall ? (
            <button
              type="button"
              className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-ui text-red-200 hover:bg-red-500/20 disabled:opacity-40"
              disabled={disabled || busy}
              onClick={() => onUninstall(item)}
            >
              Desinstalar add-on
            </button>
          ) : (
            <span className="rounded-lg border border-line px-3 py-1.5 text-[10px] text-fg-muted">
              Incluído na aplicação — não desinstalável
            </span>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {item.loadError ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-ui text-red-200/90">
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
              {customPanel.title ?? 'Painel do add-on'}
            </p>
            {!item.enabled ? (
              <p className="text-[11px] text-amber-200/80">
                Active o add-on para aplicar alterações do painel personalizado.
              </p>
            ) : null}
            <div className="rounded-lg border border-line bg-black/10 p-3">
              {customPanel.render()}
            </div>
          </div>
        ) : null}

        {shortcuts.length > 0 ? (
          <div className="space-y-2">
            <p className="text-caption font-medium uppercase tracking-wide text-fg-muted">
              Atalhos
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
                Atalhos só funcionam com o add-on activo.
              </p>
            ) : null}
          </div>
        ) : null}

        <details className="rounded-lg border border-line px-3 py-2 text-[11px] text-fg-dim">
          <summary className="cursor-pointer text-ui text-fg-muted">
            Informação técnica
          </summary>
          <p className="mt-2">
            <strong>ID:</strong> {item.manifest.id}
          </p>
          <p className="mt-1">
            <strong>Origem:</strong>{' '}
            {item.origin === 'project'
              ? 'Incluído na aplicação'
              : 'Instalado do disco'}
          </p>
          {item.installPath ? (
            <p className="mt-1 break-all">
              <strong>Pasta:</strong> {item.installPath}
            </p>
          ) : null}
          {item.manifest.permissions?.length ? (
            <p className="mt-1">
              <strong>Permissões:</strong>{' '}
              {item.manifest.permissions.join(', ')}
            </p>
          ) : null}
        </details>
      </div>
    </div>
  )
}
