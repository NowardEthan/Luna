import { useEffect, useState } from 'react'
import { lunaServerHealth } from '../lib/lunaServer/httpBridge'
import { isLunaServerBridgeAvailable } from '../lib/lunaServer/config'
import { showToast } from '../lib/toast'

export function useServerHealth(pollMs = 30_000) {
  const [ok, setOk] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!isLunaServerBridgeAvailable()) {
      setOk(null)
      return
    }
    let cancelled = false
    let wasOk: boolean | null = null

    async function check() {
      setChecking(true)
      const healthy = await lunaServerHealth()
      if (cancelled) return
      setOk(healthy)
      setChecking(false)
      if (wasOk === true && !healthy) {
        showToast('Servidor Luna offline — corre npm run server', 'error', 5000)
      }
      wasOk = healthy
    }

    void check()
    const t = window.setInterval(() => void check(), pollMs)
    return () => {
      cancelled = true
      window.clearInterval(t)
    }
  }, [pollMs])

  return { serverOk: ok, checking }
}
