import { useEffect, useState } from 'react'
import { ContextUsageIndicator } from './chat/ContextUsageIndicator'
import { eventBus } from '../core/events/EventBus'
import { useLunaAuthOptional } from '../features/auth/AuthProvider'
import { cloudSyncService } from '../features/sync/cloudSyncService'
import type { ContextUsageSnapshot } from '../lib/contextUsageEstimate'
import type { LunaModelOption } from '../lib/llmModelSelection'
import { isLunaServerBridgeAvailable } from '../lib/lunaServer/config'
import type { LunaWorkbenchMode } from '../lib/workbenchMode'

type Props = {
  workbenchMode: LunaWorkbenchMode
  modelCatalog: LunaModelOption[]
  selectedModelId: string | null
  serverOk: boolean | null
  serverChecking?: boolean
  contextUsage?: ContextUsageSnapshot | null
  onOpenLunarAccount?: () => void
}

export function StatusBar({
  workbenchMode,
  modelCatalog,
  selectedModelId,
  serverOk,
  serverChecking,
  contextUsage = null,
  onOpenLunarAccount,
}: Props) {
  const auth = useLunaAuthOptional()
  const model = modelCatalog.find((m) => m.id === selectedModelId)
  const bridge = isLunaServerBridgeAvailable()
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
    ? 'Conta Lunar'
    : auth?.usageMode === 'offline'
      ? 'Modo offline'
      : 'Sem sessão Lunar'

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-line bg-sidebar/40 px-3 py-1 text-caption text-fg-muted"
      role="status"
    >
      <span>
        Modo:{' '}
        <span className="text-fg-dim">
          {workbenchMode === 'ide' ? 'IDE' : 'Chat'}
        </span>
      </span>
      <button
        type="button"
        onClick={onOpenLunarAccount}
        className="-mx-1 flex items-center gap-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-raised/60 hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
        title={
          auth?.isLunarConnected
            ? 'Conta Lunar activa — clique para gerir'
            : 'Clique para entrar na Conta Lunar'
        }
      >
        <span
          className={`inline-block size-1.5 rounded-full ${
            auth?.isLunarConnected
              ? 'bg-emerald-400'
              : auth?.usageMode === 'offline'
                ? 'bg-fg-dim'
                : 'bg-amber-400'
          }`}
          aria-hidden
        />
        <span className={auth?.isLunarConnected ? 'text-accent' : undefined}>
          {lunarLabel}
        </span>
        {syncStatus.pushing ? <span> · sync…</span> : null}
        {syncStatus.lastError ? (
          <span className="text-red-400/80" title={syncStatus.lastError}>
            {' '}
            · sync erro
          </span>
        ) : null}
      </button>
      {model ? (
        <span className="min-w-0 truncate" title={model.label}>
          Modelo: <span className="text-fg-dim">{model.label}</span>
        </span>
      ) : null}
      {bridge ? (
        <span className="flex items-center gap-1">
          <span
            className={`inline-block size-1.5 rounded-full ${
              serverChecking
                ? 'animate-pulse bg-fg-muted'
                : serverOk
                  ? 'bg-emerald-400'
                  : 'bg-red-400'
            }`}
            aria-hidden
          />
          {serverChecking
            ? 'Servidor…'
            : serverOk
              ? 'Servidor OK'
              : 'Servidor offline'}
        </span>
      ) : null}
      {contextUsage ? (
        <ContextUsageIndicator usage={contextUsage} />
      ) : null}
      <span className="ml-auto opacity-60">Python · v0.0.0</span>
    </div>
  )
}
