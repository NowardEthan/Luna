import { memo, useEffect, useState } from 'react'
import { ContextUsageIndicator } from './chat/ContextUsageIndicator'
import { eventBus } from '../core/events/EventBus'
import { useLunaAuthOptional } from '../features/auth/AuthProvider'
import { cloudSyncService } from '../features/sync/cloudSyncService'
import type { ContextUsageSnapshot } from '../lib/contextUsageEstimate'
import type { LunaModelOption } from '../lib/llmModelSelection'
import { isLunaServerBridgeAvailable } from '../lib/lunaServer/config'
import type { LunaPrimaryView } from '../lib/primaryView'
import type { LunaWorkbenchMode } from '../lib/workbenchMode'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { lunaStatusDotClass } from '../lib/lunaVisual'
import { PlanBadge } from '../features/billing/PlanBadge'

type Props = {
  workbenchMode: LunaWorkbenchMode
  primaryView?: LunaPrimaryView
  /** Catálogo legado — só necessário sem `fixedModelLabel` (ex.: modo IDE futuro). */
  modelCatalog?: LunaModelOption[]
  selectedModelId?: string | null
  serverOk: boolean | null
  serverChecking?: boolean
  contextUsage?: ContextUsageSnapshot | null
  onOpenLunarAccount?: () => void
  onOpenBilling?: () => void
  /** Chat Luna Core: label fixo, ignora catálogo. */
  fixedModelLabel?: string
}

function modeLabel(
  workbenchMode: LunaWorkbenchMode,
  primaryView: LunaPrimaryView = 'conversation',
  t: TFunction,
): string {
  if (primaryView === 'finances') return t('statusBar.mode_finances')
  if (primaryView === 'marketplace') return t('statusBar.mode_marketplace')
  return workbenchMode === 'ide' ? t('statusBar.mode_ide') : t('statusBar.mode_chat')
}

export const StatusBar = memo(function StatusBar({
  workbenchMode,
  primaryView = 'conversation',
  modelCatalog,
  selectedModelId,
  serverOk,
  serverChecking,
  contextUsage = null,
  onOpenLunarAccount,
  onOpenBilling,
  fixedModelLabel,
}: Props) {
  const auth = useLunaAuthOptional()
  const model = fixedModelLabel
    ? { label: fixedModelLabel }
    : modelCatalog?.find((m) => m.id === selectedModelId)
  const bridge = isLunaServerBridgeAvailable()
  const { t } = useTranslation()
  const [syncTick, setSyncTick] = useState(0)

  useEffect(() => {
    const unsubs = [
      eventBus.on('lunar:sync:start', () => setSyncTick((n) => n + 1)),
      eventBus.on('lunar:sync:complete', () => setSyncTick((n) => n + 1)),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  void syncTick
  const syncStatus = cloudSyncService.getStatus()

  const lunarLabel = auth?.isLunarConnected
    ? t('statusBar.lunar_connected')
    : t('statusBar.lunar_disconnected')

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-line bg-sidebar px-3 py-1 text-caption text-fg-muted"
      role="status"
    >
      <span>
        {t('statusBar.mode')}{' '}
        <span className="text-fg-dim">
          {modeLabel(workbenchMode, primaryView, t)}
        </span>
      </span>
      <button
        type="button"
        onClick={onOpenLunarAccount}
        className="luna-btn-ghost -mx-1 flex items-center gap-1 !px-1 !py-0.5 text-left"
        title={
          auth?.isLunarConnected
            ? t('statusBar.lunar_hint_active')
            : t('statusBar.lunar_hint_inactive')
        }
      >
        <span
          className={
            auth?.isLunarConnected
              ? lunaStatusDotClass('success')
              : lunaStatusDotClass('warning')
          }
          aria-hidden
        />
        <span className={auth?.isLunarConnected ? 'text-accent' : undefined}>
          {lunarLabel}
        </span>
        {syncStatus.pushing ? <span>{t('statusBar.syncing')}</span> : null}
        {syncStatus.lastError ? (
          <span className="text-danger" title={syncStatus.lastError}>
            {t('statusBar.sync_error')}
          </span>
        ) : null}
      </button>
      {auth?.plan ? (
        <PlanBadge planId={auth.plan} onClick={onOpenBilling} />
      ) : null}
      {model ? (
        <span className="min-w-0 truncate" title={model.label}>
          {t('statusBar.model')} <span className="text-fg-dim">{model.label}</span>
        </span>
      ) : null}
      {bridge ? (
        <span className="flex items-center gap-1">
          <span
            className={
              serverChecking
                ? 'luna-status-dot animate-pulse bg-fg-muted'
                : lunaStatusDotClass(serverOk ? 'success' : 'danger')
            }
            aria-hidden
          />
          {serverChecking
            ? t('statusBar.server_checking')
            : serverOk
              ? t('statusBar.server_ok')
              : t('statusBar.server_offline')}
        </span>
      ) : null}
      {contextUsage ? (
        <ContextUsageIndicator usage={contextUsage} />
      ) : null}
      <span className="ml-auto opacity-60">Python · v0.0.0</span>
    </div>
  )
})
