import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ContextCompactionNotice } from '../components/chat/ContextCompactionNotice'
import { LunaBadgeNavigationProvider } from '../context/LunaBadgeNavigation'
import { ActivityBar } from '../components/ActivityBar'
import { AppBootSkeleton } from '../components/AppBootSkeleton'
import { ChatComposer } from '../components/ChatComposer'
import { ChatMessageColumn } from '../components/chat/ChatMessageColumn'
import { CommandPalette, type CommandItem } from '../components/CommandPalette'
import { eventBus } from '../core/events/EventBus'
import { commandRegistry } from '../core/registry/CommandRegistry'
import { panelRegistry } from '../core/registry/PanelRegistry'
import { SIDEBAR_PANEL_IDS } from './registerBuiltinUi'
import { HistoryPanel } from '../components/HistoryPanel'
import { MemoriesPanel } from '../components/MemoriesPanel'
import { dismissOnboarding, readOnboardingDismissed } from '../components/OnboardingCard'
import { PreferencesView } from '../features/settings/PreferencesView'
import { ShortcutsHelpModal } from '../components/ShortcutsHelpModal'
import { StatusBar } from '../components/StatusBar'
import { ChatSessionToolbar } from '../components/ChatSessionToolbar'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ToastHost } from '../components/ui/ToastHost'
import { isAssistantGenerating } from '../lib/assistantMessageUi'
import { downloadConversationMarkdown } from '../lib/exportConversation'
import { TitleBar } from '../components/TitleBar'
import { ResizableSplit } from '../components/ui/ResizableSplit'
import { IdeWorkbench } from '../components/ide/IdeWorkbench'
import { PendingChangesPanel } from '../components/ide/PendingChangesPanel'
import { BRAND_APP_NAME } from '../brand'
import { useAppKeyboardShortcuts } from '../hooks/useAppKeyboardShortcuts'
import { usePluginKeyboardShortcuts } from '../hooks/usePluginKeyboardShortcuts'
import { useConversations } from '../hooks/useConversations'
import { useServerHealth } from '../hooks/useServerHealth'
import type { PreparedImageAttachment } from '../lib/imageResize'
import { bridgeSetWorkbenchLayout } from '../lib/lunaBridge'
import {
  readStreamingEnabled,
  writeStreamingEnabled,
} from '../lib/llmStreamClient'
import { themeRegistry } from '../core/registry/ThemeRegistry'
import {
  cycleLunaTheme,
  readStoredThemeId,
  writeStoredThemeId,
  type LunaThemeId,
} from '../lib/lunaThemes'
import {
  readWorkbenchMode,
  writeWorkbenchMode,
  type LunaWorkbenchMode,
} from '../lib/workbenchMode'
import {
  isHistoryOpen,
  isMemoriesOpen,
  toggleSidebarPanel,
  type SidebarPanel,
} from '../lib/sidebarPanel'
import { FileExplorer } from '../components/ide/FileExplorer'
import { buildContextUsageSnapshot } from '../lib/contextUsageEstimate'
import { getIdeTurnHost } from '../lib/ideTurnHost'
import { MarketplacePage } from '../features/marketplace/MarketplacePage'
import { LunarCloudBanner } from '../components/lunar/LunarCloudBanner'
import { LunarGateScreen } from '../features/auth/LunarGateScreen'
import { useLunaAuth } from '../features/auth/AuthProvider'
import {
  readPrimaryView,
  writePrimaryView,
  type LunaPrimaryView,
} from '../lib/primaryView'

export function AppShell() {
  const lunarAuth = useLunaAuth()
  const openLunarAccount = useCallback(() => {
    lunarAuth.openGate()
  }, [lunarAuth])
  const [draft, setDraft] = useState('')
  const {
    hydrated,
    conversations,
    folders,
    activeId,
    messages,
    createConversation,
    selectConversation,
    deleteConversationById,
    removeActiveConversation,
    sendMessage,
    redoRegenerateAt,
    canRedoMessage,
    renameConversation,
    togglePinConversation,
    moveConversationToFolder,
    createFolder,
    renameFolder,
    deleteFolder,
    ragEnabled,
    setRagEnabled,
    reasoningEnabled,
    setReasoningEnabled,
    personalityId,
    setPersonality,
    memoryCrossChatEnabled,
    setMemoryCrossChatEnabled,
    memoryConversationSearchEnabled,
    setConversationSearchEnabled,
    clearUserProfileMemory,
    clearActiveConversationMemory,
    userMemory,
    deleteMemoryNote,
    updateMemoryNote,
    cancelAgentTurn,
    modelCatalog,
    selectedModelId,
    setSelectedModelId,
    modelCatalogLoading,
    modelCatalogError,
  } = useConversations()

  const [attachedImages, setAttachedImages] = useState<PreparedImageAttachment[]>([])
  const [composerBusy, setComposerBusy] = useState(false)
  const [sidebarPanel, setSidebarPanel] = useState<SidebarPanel>('none')
  const [composerMenuOpen, setComposerMenuOpen] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  /** Força actualizar lista da paleta quando plugins registam comandos (discover é async). */
  const [commandsRevision, setCommandsRevision] = useState(0)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(() => !readOnboardingDismissed())
  const [workbenchMode, setWorkbenchMode] = useState<LunaWorkbenchMode>(readWorkbenchMode)
  const [primaryView, setPrimaryView] = useState<LunaPrimaryView>(readPrimaryView)
  const [themeId, setThemeId] = useState<LunaThemeId>(() => readStoredThemeId())
  const [streamingEnabled, setStreamingEnabled] = useState(() =>
    readStreamingEnabled(),
  )

  const cycleTheme = useCallback(() => {
    setThemeId((current) => {
      const next = cycleLunaTheme(current)
      writeStoredThemeId(next)
      themeRegistry.setActive(next)
      return next
    })
  }, [])

  const listRef = useRef<HTMLDivElement>(null)
  const prevActiveIdRef = useRef<string | null>(activeId)
  const preferencesOpenRef = useRef(preferencesOpen)
  preferencesOpenRef.current = preferencesOpen
  const { serverOk, checking: serverChecking } = useServerHealth()

  const activeConversation = conversations.find((c) => c.id === activeId)
  const sessionTitle = activeConversation?.title ?? 'Nova conversa'

  const contextUsage = useMemo(
    () =>
      activeId
        ? buildContextUsageSnapshot({
            workbenchMode,
            messages,
            conversationMemory: activeConversation?.memory,
            userMemory,
            conversations,
            convId: activeId,
            personalityId,
            draft,
            ideSnapshot: getIdeTurnHost()?.getSnapshot() ?? null,
          })
        : null,
    [
      workbenchMode,
      messages,
      activeConversation?.memory,
      userMemory,
      conversations,
      activeId,
      personalityId,
      draft,
    ],
  )
  const generating = messages.some(
    (m) => m.role === 'assistant' && isAssistantGenerating(m),
  )

  useEffect(() => {
    document.title = BRAND_APP_NAME
  }, [])

  useEffect(() => {
    const bump = () => setCommandsRevision((n) => n + 1)
    const unsubs = [
      eventBus.on('plugin:activated', bump),
      eventBus.on('plugin:deactivated', bump),
      eventBus.on('plugin:discover:complete', bump),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  useEffect(() => {
    setDraft('')
    setAttachedImages([])
    setEditingTitle(false)
  }, [activeId])

  useEffect(() => {
    const el = listRef.current
    if (!el || messages.length === 0) return

    const switchedConv = prevActiveIdRef.current !== activeId
    prevActiveIdRef.current = activeId

    const last = messages[messages.length - 1]
    if (!last) return

    const instant = switchedConv
    const behavior: ScrollBehavior = instant ? 'auto' : 'smooth'

    const run = (fn: () => void) => {
      if (instant) fn()
      else requestAnimationFrame(fn)
    }

    if (last.role === 'user') {
      run(() => el.scrollTo({ top: el.scrollHeight, behavior }))
      return
    }

    if (last.role === 'assistant') {
      if (last.text === 'Pensando…') {
        run(() => el.scrollTo({ top: el.scrollHeight, behavior }))
        return
      }
      const node = el.querySelector(
        `[data-message-id="${CSS.escape(last.id)}"]`,
      )
      run(() =>
        node?.scrollIntoView({
          behavior,
          block: 'start',
          inline: 'nearest',
        }),
      )
    }
  }, [messages, activeId])

  const openMemoriesPanel = useCallback(() => {
    setSidebarPanel('memories')
  }, [])

  const closeSidePanels = useCallback(() => {
    const hadPreferences = preferencesOpenRef.current
    setSidebarPanel('none')
    setPreferencesOpen(false)
    setShortcutsOpen(false)
    setCommandOpen(false)
    if (hadPreferences) {
      requestAnimationFrame(() => {
        document.getElementById('msg-input')?.focus()
      })
    }
  }, [])

  const openConversationView = useCallback(() => {
    setPrimaryView('conversation')
    writePrimaryView('conversation')
  }, [])

  const openMarketplace = useCallback(() => {
    setPreferencesOpen(false)
    setSidebarPanel('none')
    setPrimaryView('marketplace')
    writePrimaryView('marketplace')
  }, [])

  const openPreferences = useCallback(() => {
    openConversationView()
    setSidebarPanel('none')
    setPreferencesOpen(true)
  }, [openConversationView])

  const openPreferencesAddons = useCallback(() => {
    openConversationView()
    setPreferencesOpen(false)
    try {
      sessionStorage.setItem('luna-preferences-section', 'addons')
    } catch {
      /* ignore */
    }
    requestAnimationFrame(() => setPreferencesOpen(true))
  }, [openConversationView])

  const toggleHistory = useCallback(() => {
    openConversationView()
    setPreferencesOpen(false)
    setSidebarPanel((p) => toggleSidebarPanel(p, 'history'))
  }, [openConversationView])

  const toggleMemories = useCallback(() => {
    openConversationView()
    setPreferencesOpen(false)
    setSidebarPanel((p) => toggleSidebarPanel(p, 'memories'))
  }, [openConversationView])

  const handleWorkbenchModeChange = useCallback((mode: LunaWorkbenchMode) => {
    openConversationView()
    setWorkbenchMode(mode)
    writeWorkbenchMode(mode)
    void bridgeSetWorkbenchLayout(mode)
  }, [openConversationView])

  async function handleSend() {
    const text = draft.trim()
    if ((!text && attachedImages.length === 0) || composerBusy) return
    setComposerBusy(true)
    setDraft('')
    const imgs = [...attachedImages]
    setAttachedImages([])
    const safetyMs = 240_000
    const safety = window.setTimeout(() => setComposerBusy(false), safetyMs)
    try {
      await sendMessage(text, imgs.length ? imgs : undefined)
    } finally {
      window.clearTimeout(safety)
      setComposerBusy(false)
    }
  }

  async function handleRedoMessage(messageId: string) {
    if (composerBusy || !canRedoMessage(messageId)) return
    setComposerBusy(true)
    const safetyMs = 240_000
    const safety = window.setTimeout(() => setComposerBusy(false), safetyMs)
    try {
      await redoRegenerateAt(messageId)
    } finally {
      window.clearTimeout(safety)
      setComposerBusy(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (composerBusy) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  function focusComposer() {
    document.getElementById('msg-input')?.focus()
  }

  function focusCurrentChat() {
    setSidebarPanel('none')
    requestAnimationFrame(() => {
      const el = listRef.current
      const last = messages[messages.length - 1]
      if (el && last?.role === 'assistant' && last.text !== 'Pensando…') {
        el
          .querySelector(`[data-message-id="${CSS.escape(last.id)}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
      } else if (el) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      }
      focusComposer()
    })
  }

  const commitTitleEdit = useCallback(() => {
    if (!activeId) return
    renameConversation(activeId, titleDraft)
    setEditingTitle(false)
  }, [activeId, renameConversation, titleDraft])

  const composerProps = {
    draft,
    onChange: setDraft,
    onSend: () => void handleSend(),
    onKeyDown: handleKeyDown,
    composerBusy,
    menuOpen: composerMenuOpen,
    onMenuOpenChange: setComposerMenuOpen,
    attachedImages,
    onAttachedImagesChange: setAttachedImages,
    memoryCrossChatEnabled,
    onMemoryCrossChatToggle: () =>
      setMemoryCrossChatEnabled(!memoryCrossChatEnabled),
    memoryConversationSearchEnabled,
    onMemoryConversationSearchToggle: () =>
      setConversationSearchEnabled(!memoryConversationSearchEnabled),
    onClearUserProfileMemory: clearUserProfileMemory,
    onClearConversationMemory: clearActiveConversationMemory,
    onLimpar: () => {
      removeActiveConversation()
      setComposerMenuOpen(false)
    },
    modelCatalog,
    selectedModelId,
    onModelChange: setSelectedModelId,
    modelCatalogLoading,
    modelCatalogError,
    ideMode: workbenchMode === 'ide',
    onShowShortcutsHelp: () => setShortcutsOpen(true),
    onExportConversation: activeConversation
      ? () => downloadConversationMarkdown(activeConversation)
      : undefined,
    onOpenSettings: openPreferences,
    onOpenMarketplace: openMarketplace,
    onStop: cancelAgentTurn,
  }

  const commandItems: CommandItem[] = useMemo(() => {
    const builtin: CommandItem[] = [
      {
        id: 'new-chat',
        label: 'Nova conversa',
        keywords: 'criar',
        run: () => createConversation(),
      },
      {
        id: 'toggle-ide',
        label: workbenchMode === 'ide' ? 'Modo Chat' : 'Modo IDE',
        keywords: 'workbench',
        run: () =>
          handleWorkbenchModeChange(workbenchMode === 'ide' ? 'chat' : 'ide'),
      },
      {
        id: 'history',
        label: isHistoryOpen(sidebarPanel)
          ? 'Fechar histórico'
          : 'Abrir histórico',
        run: toggleHistory,
      },
      {
        id: 'memories',
        label: isMemoriesOpen(sidebarPanel)
          ? 'Fechar memórias'
          : 'Abrir memórias',
        run: toggleMemories,
      },
      {
        id: 'marketplace',
        label: 'Abrir Marketplace',
        keywords: 'loja addons plugins extensões',
        run: openMarketplace,
      },
      {
        id: 'settings',
        label: 'Definições',
        run: () => openPreferences(),
      },
      {
        id: 'export',
        label: 'Exportar conversa (Markdown)',
        run: () => {
          if (activeConversation) downloadConversationMarkdown(activeConversation)
        },
      },
    ]
    const fromRegistry = commandRegistry.list().map((c) => ({
      id: c.id,
      label: c.label,
      keywords: c.keywords,
      run: c.run,
    }))
    return [...builtin, ...fromRegistry]
  }, [
    workbenchMode,
    sidebarPanel,
    activeConversation,
    toggleHistory,
    toggleMemories,
    createConversation,
    handleWorkbenchModeChange,
    openPreferences,
    openMarketplace,
    commandOpen,
    commandsRevision,
  ])

  usePluginKeyboardShortcuts(!preferencesOpen)

  useAppKeyboardShortcuts({
    onSend: () => void handleSend(),
    onNewConversation: () => createConversation(),
    onToggleHistory: toggleHistory,
    onToggleMemories: toggleMemories,
    onToggleWorkbench: () =>
      handleWorkbenchModeChange(workbenchMode === 'ide' ? 'chat' : 'ide'),
    onOpenCommandPalette: () => setCommandOpen(true),
    onOpenPreferences: openPreferences,
    onOpenShortcutsHelp: () => setShortcutsOpen(true),
    onCycleTheme: cycleTheme,
    onCloseOverlays: closeSidePanels,
    composerBusy,
    workbenchMode,
  })

  const headerBlock = (compact: boolean) => (
    <header
      className={`shrink-0 border-b border-line-subtle bg-sidebar/90 backdrop-blur-sm ${compact ? 'px-2 py-2' : 'px-3 py-3 sm:px-4'}`}
    >
      <div
        className={
          compact
            ? 'flex flex-col gap-1'
            : 'mx-auto flex max-w-3xl flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between'
        }
      >
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitleEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitTitleEdit()
                }
                if (e.key === 'Escape') setEditingTitle(false)
              }}
              className="w-full rounded border border-line bg-canvas px-2 py-1 text-title font-semibold text-fg focus:outline-none focus:ring-1 focus:ring-focus"
              autoFocus
              maxLength={120}
              aria-label="Renomear conversa"
            />
          ) : (
            <h1
              className={`line-clamp-2 font-semibold text-fg ${compact ? 'text-body' : 'text-title leading-snug tracking-tight'}`}
              onDoubleClick={() => {
                setTitleDraft(sessionTitle)
                setEditingTitle(true)
              }}
              title="Duplo-clique para renomear"
            >
              {sessionTitle}
            </h1>
          )}
          {!compact ? (
            <p className="mt-0.5 truncate text-ui text-fg-muted">
              Assistente {BRAND_APP_NAME}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {activeConversation ? (
            <button
              type="button"
              className="luna-btn-secondary px-2 py-1"
              onClick={() => downloadConversationMarkdown(activeConversation)}
              title="Exportar conversa"
            >
              Exportar
            </button>
          ) : null}
          <ChatSessionToolbar
            reasoningEnabled={reasoningEnabled}
            onReasoningChange={setReasoningEnabled}
            personalityId={personalityId}
            onPersonalityChange={setPersonality}
            onNewConversation={() => createConversation()}
            onOpenSettings={openPreferences}
            onOpenLunarAccount={openLunarAccount}
            disabled={composerBusy}
          />
        </div>
      </div>
    </header>
  )

  const messageList = (
    <>
      <ChatMessageColumn
        variant={workbenchMode === 'ide' ? 'ide' : 'chat'}
        listRef={listRef}
        messages={messages}
        memoryNotes={userMemory.memoryNotes}
        composerBusy={composerBusy}
        generating={generating}
        canRedoMessage={canRedoMessage}
        onRedoMessage={(id) => void handleRedoMessage(id)}
        onStarterPick={(text) => {
          setDraft(text)
          focusComposer()
        }}
        showOnboarding={showOnboarding && workbenchMode === 'chat'}
        onDismissOnboarding={() => {
          dismissOnboarding()
          setShowOnboarding(false)
        }}
      />
    </>
  )

  const chatColumn = (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-canvas">
      <div className="shrink-0">{headerBlock(workbenchMode === 'ide')}</div>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeId && activeConversation?.memory?.summarizedThroughMessageId ? (
          <div className="shrink-0 px-3 pt-2">
            <ContextCompactionNotice
              conversationId={activeId}
              summarizedThroughMessageId={
                activeConversation.memory.summarizedThroughMessageId
              }
              onClearConversationMemory={clearActiveConversationMemory}
            />
          </div>
        ) : null}
        {messageList}
      </div>
      <div className="shrink-0">
        {workbenchMode === 'ide' ? <PendingChangesPanel variant="chat" /> : null}
        <LunarCloudBanner />
        <ChatComposer {...composerProps} />
        <StatusBar
          workbenchMode={workbenchMode}
          modelCatalog={modelCatalog}
          selectedModelId={selectedModelId}
          serverOk={serverOk}
          serverChecking={serverChecking}
          contextUsage={contextUsage}
          onOpenLunarAccount={openLunarAccount}
        />
      </div>
    </div>
  )

  const preferencesShared = {
    disabled: composerBusy,
    themeId,
    onThemeChange: setThemeId,
    streamingEnabled,
    onStreamingChange: (enabled: boolean) => {
      writeStreamingEnabled(enabled)
      setStreamingEnabled(enabled)
    },
    ragEnabled,
    onRagEnabledChange: setRagEnabled,
    reasoningEnabled,
    onReasoningChange: setReasoningEnabled,
    personalityId,
    onPersonalityChange: setPersonality,
    memoryCrossChatEnabled,
    onMemoryCrossChatToggle: () =>
      setMemoryCrossChatEnabled(!memoryCrossChatEnabled),
    memoryConversationSearchEnabled,
    onMemoryConversationSearchToggle: () =>
      setConversationSearchEnabled(!memoryConversationSearchEnabled),
    onOpenMarketplace: openMarketplace,
  }

  const historyPanelNode =
    panelRegistry.get(SIDEBAR_PANEL_IDS[0]) ? (
      <HistoryPanel
        embedded
        open
        conversations={conversations}
        folders={folders}
        activeId={activeId}
        onSelect={(id) => {
          selectConversation(id)
          if (workbenchMode === 'chat') closeSidePanels()
        }}
        onDelete={deleteConversationById}
        onNewConversation={(inFolderId) =>
          createConversation(
            inFolderId ? { folderId: inFolderId } : undefined,
          )
        }
        onRenameConversation={renameConversation}
        onMoveConversation={moveConversationToFolder}
        onCreateFolder={createFolder}
        onRenameFolder={renameFolder}
        onDeleteFolder={deleteFolder}
        onTogglePin={togglePinConversation}
        onClose={closeSidePanels}
      />
    ) : null

  const memoriesPanelNode =
    panelRegistry.get(SIDEBAR_PANEL_IDS[1]) ? (
      <MemoriesPanel
        embedded
        open
        notes={userMemory.memoryNotes ?? []}
        memoryUi={userMemory.memoryUi}
        onDeleteNote={deleteMemoryNote}
        onUpdateNote={updateMemoryNote}
        onClose={closeSidePanels}
      />
    ) : null

  const sidebarOpen =
    isHistoryOpen(sidebarPanel) || isMemoriesOpen(sidebarPanel)

  if (!hydrated) {
    return <AppBootSkeleton />
  }

  return (
    <>
      {lunarAuth.gateOpen ? (
        <LunarGateScreen onClose={() => lunarAuth.closeGate()} />
      ) : null}
      <ToastHost />
      <ConfirmDialog />
      <ShortcutsHelpModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        commands={commandItems}
      />
      <div className="flex h-screen flex-col overflow-hidden bg-canvas">
        <TitleBar />

        <div className="flex min-h-0 flex-1">
          <LunaBadgeNavigationProvider
            listRef={listRef}
            onOpenMemories={openMemoriesPanel}
            onCloseSidePanels={closeSidePanels}
          >
            <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
            <ActivityBar
              workbenchMode={workbenchMode}
              primaryView={primaryView}
              onWorkbenchModeChange={handleWorkbenchModeChange}
              onOpenMarketplace={openMarketplace}
              onOpenConversation={openConversationView}
              sidebarPanel={sidebarPanel}
              onToggleHistory={toggleHistory}
              onToggleMemories={toggleMemories}
              preferencesOpen={preferencesOpen}
              onTogglePreferences={() => {
                if (preferencesOpen) setPreferencesOpen(false)
                else openPreferences()
              }}
              onNewChat={() => {
                openConversationView()
                createConversation()
              }}
              onFocusCurrentChat={() => {
                openConversationView()
                focusCurrentChat()
              }}
              onOpenLunarAccount={openLunarAccount}
            />

            <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {primaryView === 'marketplace' ? (
                <MarketplacePage onManageAddons={openPreferencesAddons} />
              ) : workbenchMode === 'ide' ? (
                <IdeWorkbench
                  chatPanel={chatColumn}
                  sidebarPanel={sidebarPanel}
                  onSidebarPanelChange={setSidebarPanel}
                  filesPanel={<FileExplorer />}
                  historyPanel={historyPanelNode ?? <div />}
                  memoriesPanel={memoriesPanelNode ?? <div />}
                />
              ) : (
              <ResizableSplit
                className="h-full min-h-0 min-w-0 flex-1"
                storageKey="chat-sidebar"
                defaultLeadingSize={288}
                minLeading={220}
                minTrailing={320}
                resizable={sidebarOpen}
                leadingSize={sidebarOpen ? undefined : 0}
                leading={
                  isHistoryOpen(sidebarPanel) && historyPanelNode ? (
                    historyPanelNode
                  ) : isMemoriesOpen(sidebarPanel) && memoriesPanelNode ? (
                    memoriesPanelNode
                  ) : (
                    <div />
                  )
                }
                trailing={
                  <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col bg-canvas">
                    {chatColumn}
                  </div>
                }
              />
              )}

              {preferencesOpen ? (
                <div
                  className="luna-overlay-enter absolute inset-0 z-40 flex flex-col bg-canvas shadow-2xl"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Definições"
                >
                  <PreferencesView
                    {...preferencesShared}
                    onOpenMarketplace={openMarketplace}
                    workbenchMode={workbenchMode}
                    onClose={() => {
                      setPreferencesOpen(false)
                      requestAnimationFrame(() => {
                        document.getElementById('msg-input')?.focus()
                      })
                    }}
                  />
                </div>
              ) : null}
            </div>
            </div>
          </LunaBadgeNavigationProvider>
        </div>
      </div>
    </>
  )
}
