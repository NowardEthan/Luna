import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { showToast } from '../../lib/toast'
import { deleteByokApiKey, saveByokApiKey, testByokConnection } from './ApiKeyVault'
import { disconnectByokProvider, saveByokProviderMeta } from './byokFirestore'
import type { ByokConfigDoc } from './byokFirestore'
import {
  BYOK_PROVIDERS,
  getByokProvider,
  type ByokProviderId,
} from './byokProviders'

const inputClass =
  'w-full rounded-lg border border-line-subtle bg-canvas px-3 py-2 text-[13px] text-fg outline-none transition focus:border-accent'

type Props = {
  open: boolean
  onClose: () => void
  uid: string
  providerId: ByokProviderId
  currentConfig: ByokConfigDoc
  onSaved: () => void
}

export function ByokSetupModal({
  open,
  onClose,
  uid,
  providerId,
  currentConfig,
  onSaved,
}: Props) {
  const def = getByokProvider(providerId)
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState(def?.baseUrl ?? '')
  const [modelMenor, setModelMenor] = useState(def?.defaultModelMenor ?? '')
  const [modelMaior, setModelMaior] = useState(def?.defaultModelMaior ?? '')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !def) return
    setApiKey('')
    setBaseUrl(def.baseUrl)
    setModelMenor(def.defaultModelMenor)
    setModelMaior(def.defaultModelMaior)
  }, [open, def, providerId])

  if (!open || !def) return null

  const handleTest = async () => {
    setBusy(true)
    try {
      const result = await testByokConnection({
        providerId,
        apiKey: apiKey.trim() || (def.optionalKey ? 'local' : ''),
        baseUrl,
        modelMenor,
        modelMaior,
      })
      if (result.ok) {
        showToast('Conexão OK com o provedor.', 'success', 4000)
      } else {
        showToast(result.error ?? 'Falha no teste.', 'error', 6000)
      }
    } finally {
      setBusy(false)
    }
  }

  const handleSave = async () => {
    if (!apiKey.trim() && !def.optionalKey) {
      showToast('Informe a chave API.', 'error', 4000)
      return
    }
    setBusy(true)
    try {
      const keyRes = await saveByokApiKey({
        uid,
        providerId,
        apiKey: apiKey.trim() || 'local',
      })
      if (!keyRes.ok) {
        showToast(keyRes.error ?? 'Erro ao guardar chave.', 'error', 6000)
        return
      }

      await saveByokProviderMeta(
        uid,
        providerId,
        {
          baseUrl: baseUrl.trim() || def.baseUrl,
          modelMenor: modelMenor.trim() || def.defaultModelMenor,
          modelMaior: modelMaior.trim() || def.defaultModelMaior,
          keyHint: keyRes.keyHint,
          connected: true,
        },
        true,
      )

      showToast(`${def.label} conectado.`, 'success', 4000)
      onSaved()
      onClose()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar.', 'error', 6000)
    } finally {
      setBusy(false)
    }
  }

  const handleDisconnect = async () => {
    setBusy(true)
    try {
      await deleteByokApiKey(uid, providerId)
      await disconnectByokProvider(uid, providerId, currentConfig)
      showToast('Chave removida deste dispositivo.', 'info', 4000)
      onSaved()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div
      className="luna-overlay-scrim fixed inset-0 z-[220] flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="byok-setup-title"
        className="luna-dialog w-full max-w-md p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="byok-setup-title" className="text-title font-semibold text-fg">
          Conectar {def.label}
        </h2>
        {def.hint ? (
          <p className="mt-1 text-[12px] text-fg-muted">{def.hint}</p>
        ) : null}

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-fg-dim">
              Chave API
            </span>
            <input
              type="password"
              autoComplete="off"
              className={inputClass}
              placeholder={def.keyPlaceholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-fg-dim">
              Base URL
            </span>
            <input
              type="url"
              className={inputClass}
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-fg-dim">
                Modelo menor
              </span>
              <input
                type="text"
                className={inputClass}
                value={modelMenor}
                onChange={(e) => setModelMenor(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium text-fg-dim">
                Modelo maior
              </span>
              <input
                type="text"
                className={inputClass}
                value={modelMaior}
                onChange={(e) => setModelMaior(e.target.value)}
              />
            </label>
          </div>
        </div>

        <p className="mt-3 text-[10px] text-fg-muted">
          A chave fica encriptada neste dispositivo (keychain do sistema). Metadados
          sincronizam na Conta Lunar.
        </p>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="luna-btn-secondary !px-3 !py-1.5"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="luna-btn-secondary !px-3 !py-1.5"
            onClick={() => void handleDisconnect()}
            disabled={busy}
          >
            Remover chave
          </button>
          <button
            type="button"
            className="luna-btn-secondary !px-3 !py-1.5"
            onClick={() => void handleTest()}
            disabled={busy}
          >
            Testar
          </button>
          <button
            type="button"
            className="luna-btn-primary !px-3 !py-1.5"
            onClick={() => void handleSave()}
            disabled={busy}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function providerLabel(id: ByokProviderId): string {
  return BYOK_PROVIDERS.find((p) => p.id === id)?.label ?? id
}
