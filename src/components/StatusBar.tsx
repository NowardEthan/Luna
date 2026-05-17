import type { LunaModelOption } from '../lib/llmModelSelection'
import type { LunaWorkbenchMode } from '../lib/workbenchMode'
import { isLunaServerBridgeAvailable } from '../lib/lunaServer/config'

type Props = {
  workbenchMode: LunaWorkbenchMode
  modelCatalog: LunaModelOption[]
  selectedModelId: string | null
  serverOk: boolean | null
  serverChecking?: boolean
}

export function StatusBar({
  workbenchMode,
  modelCatalog,
  selectedModelId,
  serverOk,
  serverChecking,
}: Props) {
  const model = modelCatalog.find((m) => m.id === selectedModelId)
  const bridge = isLunaServerBridgeAvailable()

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
      <span className="ml-auto opacity-60">Python · v0.0.0</span>
    </div>
  )
}
