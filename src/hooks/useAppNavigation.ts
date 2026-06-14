import { useCallback, useEffect, useState } from 'react'
import { bridgeSetWorkbenchLayout } from '../lib/lunaBridge'
import { normalizeWorkbenchMode } from '../lib/lunaIdeAddon'
import { normalizePrimaryViewForFinances } from '../lib/lunaFinancesAddon'
import { setLunaIdeWorkbenchToggle } from '../plugins/luna-ide'
import { setLunaFinancesOpenHandler } from '../plugins/luna-finances'
import type { ChatPersonalityId } from '../lib/chatPersonality'
import {
  readWorkbenchMode,
  writeWorkbenchMode,
  type LunaWorkbenchMode,
} from '../lib/workbenchMode'
import {
  readPrimaryView,
  writePrimaryView,
  type LunaPrimaryView,
} from '../lib/primaryView'
import {
  isHistoryOpen,
  isMemoriesOpen,
  toggleSidebarPanel,
  type SidebarPanel,
} from '../lib/sidebarPanel'

type UseAppNavigationOpts = {
  createConversation: (opts?: {
    folderId?: string | null
    variant?: LunaWorkbenchMode | 'finances'
    workspaceRoot?: string | null
    sourceMode?: 'chat' | 'ide'
  }) => string
  personalityId: ChatPersonalityId
  setPersonality: (id: ChatPersonalityId) => void
  lunaIdeActive: boolean
  lunaFinancesActive: boolean
}

export function useAppNavigation({
  createConversation,
  personalityId,
  setPersonality,
  lunaIdeActive,
  lunaFinancesActive,
}: UseAppNavigationOpts) {
  const [workbenchMode, setWorkbenchModeState] = useState<LunaWorkbenchMode>(() =>
    normalizeWorkbenchMode(readWorkbenchMode()),
  )
  const [primaryView, setPrimaryViewState] = useState<LunaPrimaryView>(() =>
    normalizePrimaryViewForFinances(readPrimaryView()),
  )
  const [sidebarPanel, setSidebarPanel] = useState<SidebarPanel>('none')

  const openConversationView = useCallback(() => {
    setPrimaryViewState('conversation')
    writePrimaryView('conversation')
  }, [])

  const handleWorkbenchModeChange = useCallback(
    (mode: LunaWorkbenchMode) => {
      const next = normalizeWorkbenchMode(mode)
      openConversationView()
      if (next === 'ide') {
        setSidebarPanel('none')
      }
      setWorkbenchModeState(next)
      writeWorkbenchMode(next)
      void bridgeSetWorkbenchLayout(next)
    },
    [openConversationView],
  )

  useEffect(() => {
    setLunaIdeWorkbenchToggle(() => {
      handleWorkbenchModeChange(workbenchMode === 'ide' ? 'chat' : 'ide')
    })
    return () => setLunaIdeWorkbenchToggle(null)
  }, [handleWorkbenchModeChange, workbenchMode])

  useEffect(() => {
    if (!lunaIdeActive && workbenchMode === 'ide') {
      handleWorkbenchModeChange('chat')
    }
  }, [lunaIdeActive, workbenchMode, handleWorkbenchModeChange])

  const openFinances = useCallback(() => {
    setSidebarPanel('none')
    setPrimaryViewState('finances')
    writePrimaryView('finances')
    if (personalityId !== 'gestora') setPersonality('gestora')
  }, [personalityId, setPersonality])

  useEffect(() => {
    setLunaFinancesOpenHandler(openFinances)
    return () => setLunaFinancesOpenHandler(null)
  }, [openFinances])

  useEffect(() => {
    if (!lunaFinancesActive && primaryView === 'finances') {
      openConversationView()
    }
  }, [lunaFinancesActive, primaryView, openConversationView])

  const openMarketplace = useCallback(() => {
    setSidebarPanel('none')
    setPrimaryViewState('marketplace')
    writePrimaryView('marketplace')
  }, [])

  const openHistoryPanel = useCallback(() => {
    openConversationView()
    setSidebarPanel('history')
  }, [openConversationView])

  const toggleHistory = useCallback(() => {
    openConversationView()
    setSidebarPanel((p) => toggleSidebarPanel(p, 'history'))
  }, [openConversationView])

  const toggleMemories = useCallback(() => {
    openConversationView()
    setSidebarPanel((p) => toggleSidebarPanel(p, 'memories'))
  }, [openConversationView])

  const openMemoriesPanel = useCallback(() => {
    setSidebarPanel('memories')
  }, [])

  const startNewConversation = useCallback(
    (opts?: { folderId?: string | null }) => {
      const variant =
        primaryView === 'finances'
          ? 'finances'
          : workbenchMode === 'ide'
            ? 'ide'
            : 'chat'
      createConversation(
        opts?.folderId != null ? { folderId: opts.folderId, variant } : { variant },
      )
    },
    [createConversation, primaryView, workbenchMode],
  )

  const sidebarOpen = isHistoryOpen(sidebarPanel) || isMemoriesOpen(sidebarPanel)
  const isHistoryPanelOpen = isHistoryOpen(sidebarPanel)
  const isMemoriesPanelOpen = isMemoriesOpen(sidebarPanel)

  return {
    workbenchMode,
    primaryView,
    sidebarPanel,
    setSidebarPanel,
    sidebarOpen,
    isHistoryPanelOpen,
    isMemoriesPanelOpen,
    openConversationView,
    openHistoryPanel,
    openMarketplace,
    openFinances,
    openMemoriesPanel,
    toggleHistory,
    toggleMemories,
    startNewConversation,
    handleWorkbenchModeChange,
  }
}
