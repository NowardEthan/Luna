import { useEffect, useRef } from 'react'
import { eventBus } from '../core/events/EventBus'
import { useForgeLayout } from '../context/ForgeLayoutContext'
import { useLunaWorkspace } from '../context/LunaWorkspaceContext'

/** Abre o ficheiro no editor quando o agente propõe um patch (F5 review unificado). */
export function useForgePatchAutoOpen(enabled: boolean) {
  const ws = useLunaWorkspace()
  const forge = useForgeLayout()
  const wsRef = useRef(ws)
  wsRef.current = ws
  const forgeRef = useRef(forge)
  forgeRef.current = forge

  useEffect(() => {
    if (!enabled) return

    return eventBus.on('workspace:patch:proposed', ({ path }) => {
      void wsRef.current.openFile(path)
      const f = forgeRef.current
      f.setBottomTab('problems')
      if (!f.bottomPanelOpen) {
        f.setBottomPanelOpen(true)
      }
    })
  }, [enabled])
}
