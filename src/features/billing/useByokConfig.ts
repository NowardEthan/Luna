import { useEffect, useState } from 'react'
import { useLunaAuthOptional } from '../auth/AuthProvider'
import {
  EMPTY_BYOK_CONFIG,
  subscribeByokConfig,
  type ByokConfigDoc,
} from './byokFirestore'
import { listByokKeyHints } from './ApiKeyVault'
import { BYOK_PROVIDERS } from './byokProviders'

export type ByokProviderStatus = {
  id: string
  label: string
  connected: boolean
  active: boolean
  keyHint?: string
}

export function useByokConfig() {
  const auth = useLunaAuthOptional()
  const uid = auth?.user?.uid
  const [config, setConfig] = useState<ByokConfigDoc>(EMPTY_BYOK_CONFIG)
  const [localKeys, setLocalKeys] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setConfig(EMPTY_BYOK_CONFIG)
      setLocalKeys({})
      setLoading(false)
      return
    }

    setLoading(true)
    const unsub = subscribeByokConfig(uid, (next) => {
      setConfig(next)
      setLoading(false)
    })

    void listByokKeyHints(uid).then(setLocalKeys)

    return unsub
  }, [uid])

  const providers: ByokProviderStatus[] = BYOK_PROVIDERS.map((p) => {
    const meta = config.providers[p.id]
    const hasLocalKey = Boolean(localKeys[p.id])
    const connected = Boolean(meta?.connected && hasLocalKey)
    return {
      id: p.id,
      label: p.label,
      connected,
      active: config.activeProviderId === p.id && connected,
      keyHint: meta?.keyHint,
    }
  })

  const refreshLocalKeys = async () => {
    if (!uid) return
    setLocalKeys(await listByokKeyHints(uid))
  }

  return {
    loading,
    config,
    providers,
    activeProviderId: config.activeProviderId,
    refreshLocalKeys,
    uid,
    isByokPlan: auth?.plan === 'byok',
  }
}
