import { useState } from 'react'
import type { ByokProviderId } from './byokProviders'
import { ByokSetupModal } from './ByokSetupModal'
import { setActiveByokProvider } from './byokFirestore'
import { useByokConfig } from './useByokConfig'
import { showToast } from '../../lib/toast'

type Props = {
  uid: string
  compact?: boolean
}

export function ByokProviderSelector({ uid, compact }: Props) {
  const { providers, loading, config, refreshLocalKeys } = useByokConfig()
  const [setupId, setSetupId] = useState<ByokProviderId | null>(null)

  const handleActivate = async (id: ByokProviderId, connected: boolean) => {
    if (!connected) {
      setSetupId(id)
      return
    }
    try {
      await setActiveByokProvider(uid, id)
      showToast('Provedor activo actualizado.', 'success', 3000)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro.', 'error', 5000)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-line bg-canvas px-4 py-6 text-center text-[12px] text-fg-muted">
        A carregar provedores…
      </div>
    )
  }

  return (
    <>
      <div className="space-y-0 overflow-hidden rounded-xl border border-line">
        {providers.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center justify-between gap-3 bg-canvas px-4 py-2.5 ${
              i > 0 ? 'border-t border-line-subtle' : ''
            }`}
          >
            <div className="min-w-0">
              <p className="text-[12px] text-fg-dim">{p.label}</p>
              {!compact && p.keyHint ? (
                <p className="text-[10px] text-fg-muted">{p.keyHint}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`text-[10px] font-semibold ${
                  p.connected ? 'text-success' : 'text-fg-muted'
                }`}
              >
                {p.connected ? (p.active ? '● Activo' : '● Conectado') : '○ Não configurado'}
              </span>
              <button
                type="button"
                className="luna-btn-secondary !px-2 !py-1 text-[10px]"
                onClick={() => {
                  const id = p.id as ByokProviderId
                  if (!p.connected || p.active) {
                    setSetupId(id)
                  } else {
                    void handleActivate(id, true)
                  }
                }}
              >
                {p.connected ? (p.active ? 'Configurar' : 'Activar') : 'Conectar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {setupId ? (
        <ByokSetupModal
          open
          providerId={setupId}
          uid={uid}
          currentConfig={config}
          onClose={() => setSetupId(null)}
          onSaved={() => void refreshLocalKeys()}
        />
      ) : null}
    </>
  )
}
