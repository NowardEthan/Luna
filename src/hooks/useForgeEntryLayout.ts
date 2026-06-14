import { useEffect, useRef } from 'react'
import { useForgeLayout } from '../context/ForgeLayoutContext'

/**
 * Ao entrar no Forge com projecto aberto, abre a sidebar no histórico
 * de sessões (em vez do explorador de ficheiros).
 */
export function useForgeEntryLayout(enabled: boolean) {
  const { setActiveView, setAiPanelOpen, setSidebarOpen } = useForgeLayout()
  const appliedRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      appliedRef.current = false
      return
    }
    if (appliedRef.current) return
    appliedRef.current = true
    setActiveView('conversations')
    setSidebarOpen(true)
    setAiPanelOpen(true)
  }, [enabled, setActiveView, setAiPanelOpen, setSidebarOpen])
}
