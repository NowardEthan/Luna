import { useEffect, useState } from 'react'
import { eventBus } from '../../core/events/EventBus'

/** Força re-render quando o estado runtime de sync muda. */
export function useCloudSyncTick(): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const unsubs = [
      eventBus.on('lunar:sync:tick', () => setTick((n) => n + 1)),
      eventBus.on('lunar:sync:complete', () => setTick((n) => n + 1)),
      eventBus.on('lunar:sync:start', () => setTick((n) => n + 1)),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])
  return tick
}
