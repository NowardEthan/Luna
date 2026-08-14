import { useEffect, useState } from 'react'
import { eventBus } from '../../core/events/EventBus'
import { hydrateFromLocalStorage } from '../chat/state/conversationPersistence'
import { fetchRemoteCloudUsage } from '../sync/cloudStorageUsage'
import type { CloudStorageUsage } from '../sync/cloudStorageUsage'
import { estimateLocalCloudUsage } from '../sync/cloudStorageUsage'
import {
  readLocalCloudStats,
  type LunarLocalCloudStats,
  type LunarRemoteCloudStats,
} from './lunarAccountStats'
import type { LunaPlanId } from '../../lib/firebase/entitlements'
import { useLunaAuthOptional } from './AuthProvider'

type State = {
  local: LunarLocalCloudStats
  remote: LunarRemoteCloudStats | null
  remoteLoading: boolean
  remoteError: string | null
  storage: CloudStorageUsage | null
  storageLoading: boolean
}

export function useLunarAccountStats(
  fetchRemote: boolean,
  plan: LunaPlanId = 'free',
): State {
  const [local, setLocal] = useState<LunarLocalCloudStats>(() => readLocalCloudStats(uid))
  const [remote, setRemote] = useState<LunarRemoteCloudStats | null>(null)
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [remoteError, setRemoteError] = useState<string | null>(null)
  const [storage, setStorage] = useState<CloudStorageUsage | null>(null)
  const [storageLoading, setStorageLoading] = useState(false)
  const auth = useLunaAuthOptional()
  const uid = auth?.user?.uid ?? null

  const refreshLocal = () => setLocal(readLocalCloudStats(uid))

  useEffect(() => {
    refreshLocal()
    const state = hydrateFromLocalStorage(uid)
    if (state) {
      setStorage(estimateLocalCloudUsage(state, plan))
    }
    const unsubs = [
      eventBus.on('lunar:sync:complete', () => {
        refreshLocal()
        const s = hydrateFromLocalStorage(uid)
        if (s) setStorage(estimateLocalCloudUsage(s, plan))
      }),
      eventBus.on('lunar:sync:hydrate', () => {
        refreshLocal()
        const s = hydrateFromLocalStorage(uid)
        if (s) setStorage(estimateLocalCloudUsage(s, plan))
      }),
      eventBus.on('conversation:created', refreshLocal),
    ]
    return () => unsubs.forEach((u) => u())
  }, [plan, uid])

  useEffect(() => {
    if (!fetchRemote) {
      setRemote(null)
      setRemoteLoading(false)
      setRemoteError(null)
      setStorage((prev) => {
        const state = hydrateFromLocalStorage(uid)
        return state ? estimateLocalCloudUsage(state, plan) : prev
      })
      return
    }

    let cancelled = false
    setRemoteLoading(true)
    setStorageLoading(true)
    setRemoteError(null)

    void fetchRemoteCloudUsage(plan)
      .then((usage) => {
        if (cancelled) return
        if (usage) {
          setStorage(usage)
          setRemote({
            conversationCount: usage.conversationCount,
            estimatedBytes: usage.totalBytes,
          })
        } else {
          setRemote(null)
          const state = hydrateFromLocalStorage(uid)
          if (state) setStorage(estimateLocalCloudUsage(state, plan))
        }
      })
      .catch((err) => {
        if (cancelled) return
        setRemoteError(
          err instanceof Error ? err.message : 'Não foi possível ler a nuvem.',
        )
        const state = hydrateFromLocalStorage(uid)
        if (state) setStorage(estimateLocalCloudUsage(state, plan))
      })
      .finally(() => {
        if (!cancelled) {
          setRemoteLoading(false)
          setStorageLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [fetchRemote, plan, uid])

  return { local, remote, remoteLoading, remoteError, storage, storageLoading }
}
