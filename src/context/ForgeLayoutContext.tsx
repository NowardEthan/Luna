import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  readForgeAiPanelOpen,
  readForgeBottomOpen,
  readForgeBottomTab,
  readForgeEditorMinimap,
  readForgeEditorSplit,
  readForgeSidebarOpen,
  readForgeSidebarView,
  writeForgeAiPanelOpen,
  writeForgeBottomOpen,
  writeForgeBottomTab,
  writeForgeEditorMinimap,
  writeForgeEditorSplit,
  writeForgeSidebarOpen,
  writeForgeSidebarView,
  type ForgeBottomTab,
  type ForgeSidebarView,
} from '../lib/forgeLayout'

export type ForgeEditorPane = 'primary' | 'secondary'

type RevealLine = { path: string; line: number }

type ForgeLayoutContextValue = {
  activeView: ForgeSidebarView
  setActiveView: (view: ForgeSidebarView) => void
  toggleView: (view: ForgeSidebarView) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  aiPanelOpen: boolean
  setAiPanelOpen: (open: boolean) => void
  toggleAiPanel: () => void
  bottomPanelOpen: boolean
  setBottomPanelOpen: (open: boolean) => void
  toggleBottomPanel: () => void
  bottomTab: ForgeBottomTab
  setBottomTab: (tab: ForgeBottomTab) => void
  revealLine: RevealLine | null
  setRevealLine: (target: RevealLine | null) => void
  quickOpen: boolean
  setQuickOpen: (open: boolean) => void
  editorSplit: boolean
  setEditorSplit: (open: boolean) => void
  toggleEditorSplit: () => void
  editorMinimap: boolean
  setEditorMinimap: (open: boolean) => void
  toggleEditorMinimap: () => void
  focusPane: ForgeEditorPane
  setFocusPane: (pane: ForgeEditorPane) => void
  splitFilePath: string | null
  setSplitFilePath: (path: string | null) => void
}

const ForgeLayoutContext = createContext<ForgeLayoutContextValue | null>(null)

export function ForgeLayoutProvider({ children }: { children: ReactNode }) {
  const [activeView, setActiveViewState] = useState<ForgeSidebarView>(
    readForgeSidebarView,
  )
  const [sidebarOpen, setSidebarOpenState] = useState(readForgeSidebarOpen)
  const [aiPanelOpen, setAiPanelOpenState] = useState(readForgeAiPanelOpen)
  const [bottomPanelOpen, setBottomPanelOpenState] = useState(readForgeBottomOpen)
  const [bottomTab, setBottomTabState] = useState<ForgeBottomTab>(readForgeBottomTab)
  const [revealLine, setRevealLine] = useState<RevealLine | null>(null)
  const [quickOpen, setQuickOpen] = useState(false)
  const [editorSplit, setEditorSplitState] = useState(readForgeEditorSplit)
  const [editorMinimap, setEditorMinimapState] = useState(readForgeEditorMinimap)
  const [focusPane, setFocusPane] = useState<ForgeEditorPane>('primary')
  const [splitFilePath, setSplitFilePathState] = useState<string | null>(null)

  const setRevealLineStable = useCallback((target: RevealLine | null) => {
    setRevealLine(target)
  }, [])

  const setQuickOpenStable = useCallback((open: boolean) => {
    setQuickOpen(open)
  }, [])

  const setActiveView = useCallback((view: ForgeSidebarView) => {
    setActiveViewState(view)
    writeForgeSidebarView(view)
    setSidebarOpenState(true)
    writeForgeSidebarOpen(true)
  }, [])

  const toggleView = useCallback((view: ForgeSidebarView) => {
    setActiveViewState((current) => {
      if (current === view && sidebarOpen) {
        setSidebarOpenState(false)
        writeForgeSidebarOpen(false)
        return current
      }
      writeForgeSidebarView(view)
      setSidebarOpenState(true)
      writeForgeSidebarOpen(true)
      return view
    })
  }, [sidebarOpen])

  const setSidebarOpen = useCallback((open: boolean) => {
    setSidebarOpenState(open)
    writeForgeSidebarOpen(open)
  }, [])

  const setAiPanelOpen = useCallback((open: boolean) => {
    setAiPanelOpenState(open)
    writeForgeAiPanelOpen(open)
  }, [])

  const toggleAiPanel = useCallback(() => {
    setAiPanelOpenState((open) => {
      const next = !open
      writeForgeAiPanelOpen(next)
      return next
    })
  }, [])

  const setBottomPanelOpen = useCallback((open: boolean) => {
    setBottomPanelOpenState(open)
    writeForgeBottomOpen(open)
  }, [])

  const toggleBottomPanel = useCallback(() => {
    setBottomPanelOpenState((open) => {
      const next = !open
      writeForgeBottomOpen(next)
      return next
    })
  }, [])

  const setBottomTab = useCallback((tab: ForgeBottomTab) => {
    setBottomTabState(tab)
    writeForgeBottomTab(tab)
    setBottomPanelOpenState(true)
    writeForgeBottomOpen(true)
  }, [])

  const setEditorSplit = useCallback((open: boolean) => {
    setEditorSplitState(open)
    writeForgeEditorSplit(open)
    if (!open) {
      setFocusPane('primary')
      setSplitFilePathState(null)
    }
  }, [])

  const toggleEditorSplit = useCallback(() => {
    setEditorSplitState((open) => {
      const next = !open
      writeForgeEditorSplit(next)
      if (!next) {
        setFocusPane('primary')
        setSplitFilePathState(null)
      }
      return next
    })
  }, [])

  const setEditorMinimap = useCallback((open: boolean) => {
    setEditorMinimapState(open)
    writeForgeEditorMinimap(open)
  }, [])

  const toggleEditorMinimap = useCallback(() => {
    setEditorMinimapState((open) => {
      const next = !open
      writeForgeEditorMinimap(next)
      return next
    })
  }, [])

  const setSplitFilePath = useCallback((path: string | null) => {
    setSplitFilePathState(path)
  }, [])

  const value = useMemo(
    () => ({
      activeView,
      setActiveView,
      toggleView,
      sidebarOpen,
      setSidebarOpen,
      aiPanelOpen,
      setAiPanelOpen,
      toggleAiPanel,
      bottomPanelOpen,
      setBottomPanelOpen,
      toggleBottomPanel,
      bottomTab,
      setBottomTab,
      revealLine,
      setRevealLine: setRevealLineStable,
      quickOpen,
      setQuickOpen: setQuickOpenStable,
      editorSplit,
      setEditorSplit,
      toggleEditorSplit,
      editorMinimap,
      setEditorMinimap,
      toggleEditorMinimap,
      focusPane,
      setFocusPane,
      splitFilePath,
      setSplitFilePath,
    }),
    [
      activeView,
      setActiveView,
      toggleView,
      sidebarOpen,
      setSidebarOpen,
      aiPanelOpen,
      setAiPanelOpen,
      toggleAiPanel,
      bottomPanelOpen,
      setBottomPanelOpen,
      toggleBottomPanel,
      bottomTab,
      setBottomTab,
      revealLine,
      quickOpen,
      setRevealLineStable,
      setQuickOpenStable,
      editorSplit,
      setEditorSplit,
      toggleEditorSplit,
      editorMinimap,
      setEditorMinimap,
      toggleEditorMinimap,
      focusPane,
      splitFilePath,
      setSplitFilePath,
    ],
  )

  return (
    <ForgeLayoutContext.Provider value={value}>
      {children}
    </ForgeLayoutContext.Provider>
  )
}

export function useForgeLayout(): ForgeLayoutContextValue {
  const ctx = useContext(ForgeLayoutContext)
  if (!ctx) {
    throw new Error('useForgeLayout must be used within ForgeLayoutProvider')
  }
  return ctx
}
