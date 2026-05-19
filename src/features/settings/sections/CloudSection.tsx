import { useEffect, useMemo, useState } from 'react'
import { useLunaAuth } from '../../auth/AuthProvider'
import { cloudSyncService } from '../../sync/cloudSyncService'
import { eventBus } from '../../../core/events/EventBus'
import { readLunaCloudConfig } from '../../../lib/lunaCloud'
import type { PreferencesSharedProps } from '../settingsSections'

export function CloudSection({ disabled }: PreferencesSharedProps) {
  const auth = useLunaAuth()
  const cloud = useMemo(() => readLunaCloudConfig(), [])
  const [, setSyncTick] = useState(0)

  useEffect(() => {
    const unsubs = [
      eventBus.on('lunar:sync:start', () => setSyncTick((n) => n + 1)),
      eventBus.on('lunar:sync:complete', () => setSyncTick((n) => n + 1)),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  const sync = cloudSyncService.getStatus()

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-title font-semibold text-fg">Conta Lunar</h2>
        <p className="mt-1 text-ui text-fg-muted">
          Modelos online hospedados pela Luna, sincronização entre dispositivos e
          loja remota. Modo offline: Ollama, IDE e RAG local neste computador.
        </p>
      </header>

      <section className="luna-surface-panel space-y-3 rounded-lg border border-line p-4">
        <h3 className="text-ui font-medium text-fg">Modo actual</h3>
        <p className="text-ui text-fg">
          {auth.isLunarConnected
            ? 'Lunar Cloud — sessão activa'
            : auth.usageMode === 'offline'
              ? 'Offline — só recursos locais'
              : 'Sem sessão — inicie a Conta Lunar para a nuvem'}
        </p>
        <div className="flex flex-wrap gap-2">
          {!auth.isLunarConnected ? (
            <>
              <button
                type="button"
                className="luna-btn-primary px-3 py-1.5"
                disabled={disabled || !auth.configured}
                onClick={() => void auth.signInWithGoogle()}
              >
                Entrar com Google
              </button>
              <button
                type="button"
                className="luna-btn-secondary px-3 py-1.5"
                disabled={disabled}
                onClick={() => auth.openGate()}
              >
                Ver opções de conta
              </button>
            </>
          ) : null}
          {auth.usageMode !== 'offline' ? (
            <button
              type="button"
              className="luna-btn-secondary px-3 py-1.5"
              disabled={disabled}
              onClick={() => auth.continueOffline()}
            >
              Mudar para offline
            </button>
          ) : (
            <button
              type="button"
              className="luna-btn-secondary px-3 py-1.5"
              disabled={disabled}
              onClick={() => auth.setUsageModeCloud()}
            >
              Preferir modo cloud
            </button>
          )}
          {auth.isLunarConnected ? (
            <button
              type="button"
              className="luna-btn-secondary px-3 py-1.5"
              disabled={disabled}
              onClick={() => void auth.signOut()}
            >
              Terminar sessão
            </button>
          ) : null}
        </div>
        {auth.error ? (
          <p className="text-ui text-red-400/90" role="alert">
            {auth.error}
          </p>
        ) : null}
      </section>

      <section className="luna-surface-panel space-y-2 rounded-lg border border-line p-4">
        <h3 className="text-ui font-medium text-fg">Sincronização</h3>
        <ul className="space-y-1 text-ui text-fg-muted">
          <li>
            Firestore:{' '}
            <span className={cloud.syncEnabled ? 'text-accent' : 'text-fg-dim'}>
              {cloud.syncEnabled ? 'activada' : 'desligada (VITE_LUNA_CLOUD_SYNC)'}
            </span>
          </li>
          <li>
            Último sync:{' '}
            {sync.lastSyncAt
              ? new Date(sync.lastSyncAt).toLocaleString()
              : 'ainda não'}
          </li>
          {sync.lastError ? (
            <li className="text-red-400/90">{sync.lastError}</li>
          ) : null}
        </ul>
        {auth.isLunarConnected && cloud.syncEnabled ? (
          <button
            type="button"
            className="luna-btn-secondary px-3 py-1.5"
            disabled={disabled || sync.pushing}
            onClick={() => void cloudSyncService.pullFromCloud()}
          >
            Sincronizar agora
          </button>
        ) : null}
      </section>

      <section className="luna-surface-panel space-y-2 rounded-lg border border-line p-4 text-ui text-fg-muted">
        <h3 className="font-medium text-fg">Plano</h3>
        <p>
          Plano actual: <span className="text-fg">free</span> — LLM hospedado,
          sync e marketplace incluídos.
        </p>
      </section>
    </div>
  )
}
