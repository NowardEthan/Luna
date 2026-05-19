import { useEffect, useState } from 'react'
import { eventBus } from '../core/events/EventBus'

/** Incrementa quando o tema Luna muda — força re-render de cores dependentes do tema. */
export function useThemeRevision(): number {
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    return eventBus.on('theme:changed', () => {
      setRevision((r) => r + 1)
    })
  }, [])
  return revision
}
