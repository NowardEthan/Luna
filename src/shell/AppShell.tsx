import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { useTranslation } from 'react-i18next'
import { ContextCompactionNotice } from '../components/chat/ContextCompactionNotice'
import { LunaBadgeNavigationProvider } from '../context/LunaBadgeNavigation'
import { AppSidebar } from './AppSidebar'
import { AppBootSkeleton } from '../components/AppBootSkeleton'
import { ChatMessageColumn } from '../components/chat/ChatMessageColumn'
import { ChatSessionHeader } from '../components/ChatSessionHeader'
import { MainLayout } from './layouts/MainLayout'
import { ChatColumn } from './ChatColumn'
import { CommandPalette, type CommandItem } from '../components/CommandPalette'
import { eventBus } from '../core/events/EventBus'
import { commandRegistry } from '../core/registry/CommandRegistry'
import { panelRegistry } from '../core/registry/PanelRegistry'
import { SIDEBAR_PANEL_IDS } from './registerBuiltinUi'
import { HistoryPanel } from '../components/HistoryPanel'
import { MemoriesPanel } from '../components/MemoriesPanel'
import { PreferencesView } from '../features/settings/PreferencesView'
import { ShortcutsHelpModal } from '../components/ShortcutsHelpModal'

import { ChatShellFooter } from './ChatShellFooter'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { CpfCnpjDialog } from '../ui/CpfCnpjDialog'
import { ToastHost } from '../components/ui/ToastHost'
import {
  SIMPLE_CHAT_MODEL_LABEL,
  SIMPLE_CHAT_PROVIDER_LABEL,
} from '../features/chat/simpleChatLlmConfig'
import { useLunaCoreBilling } from '../features/billing/useLunaCoreBilling'
import { useIdeModelCatalog } from '../features/chat/useIdeModelCatalog'
import { resolveSelectedOption } from '../lib/llmModelSelection'
import { downloadConversationMarkdown } from '../lib/exportConversation'
import {
  isAssistantGenerating,
  readAssistantTurnPhase,
} from '../lib/assistantMessageUi'
import { TitleBar } from '../components/TitleBar'
import { IdeWorkbench } from '../components/ide/IdeWorkbench'
import { BRAND_APP_NAME } from '../brand'
import { useAppKeyboardShortcuts } from '../hooks/useAppKeyboardShortcuts'
import { useChatScrollFollow } from '../hooks/useChatScrollFollow'
import { usePluginKeyboardShortcuts } from '../hooks/usePluginKeyboardShortcuts'
import { buildWelcomePanel } from '../features/chat/contextualChatWelcome'
import {
  getFinancesActiveTab,
  subscribeFinancesActiveTab,
} from '../lib/financesUiState'
import { useConversations } from '../hooks/useConversations'
import { useServerHealth } from '../hooks/useServerHealth'
import { FileExplorer } from '../components/ide/FileExplorer'
import { setComposerDraft } from '../lib/composerDraftStore'
import { MarketplacePage } from '../features/marketplace/MarketplacePage'
import { FinancesPage } from '../features/finances/FinancesPage'
import { LunarGateScreen } from '../features/auth/LunarGateScreen'
import { useLunaAuth } from '../features/auth/AuthProvider'
import { useLunaIdeAddon } from '../hooks/useLunaIdeAddon'
import { useLunaFinancesAddon } from '../hooks/useLunaFinancesAddon'
import { useAppNavigation } from '../hooks/useAppNavigation'
import { useComposerDraft } from '../hooks/useComposerDraft'
import { useAppShellUI } from '../hooks/useAppShellUI'
import { useLunaWorkspace } from '../context/LunaWorkspaceContext'
import { useWorkspaceConversationSync } from '../features/ide/useWorkspaceConversationSync'
import { IdeWorkspaceHeader } from '../components/ide/IdeWorkspaceHeader'

export function AppShell() {
  const { t } = useTranslation()
  const lunarAuth = useLunaAuth()
  const { active: lunaIdeActive } = useLunaIdeAddon()
  const { active: lunaFinancesActive } = useLunaFinancesAddon()
  const { serverOk, checking: serverChecking } = useServerHealth()

  const { hydrated, conv, foldersState, model, memory, sync, buildWelcomeContext } =
    useConversations()
  const workspace = useLunaWorkspace()

  // ── Hooks de estado ────────────────────────────────────────────────────────

  const nav = useAppNavigation({
    createConversation: conv.createConversation,
    personalityId: model.personalityId,
    setPersonality: model.setPersonality,
    lunaIdeActive,
    lunaFinancesActive,
  })

  const composer = useComposerDraft({
    activeId: conv.activeId,
    sendMessage: conv.sendMessage,
    redoRegenerateAt: conv.redoRegenerateAt,
    canRedoMessage: conv.canRedoMessage,
  })

  useWorkspaceConversationSync({
    hydrated,
    workbenchMode: nav.workbenchMode,
    workspaceRoot: workspace.workspaceRoot,
    conversations: conv.conversations,
    activeId: conv.activeId,
    activeIdByScope: conv.activeIdByScope,
    setActiveId: conv.setActiveId,
    rememberActiveForScope: conv.rememberActiveForScope,
    pushRecentWorkspace: conv.pushRecentWorkspace,
    createConversation: conv.createConversation,
    buildWelcomeContext,
  })

  const ui = useAppShellUI({ activeId: conv.activeId })

  // ── Estado local ───────────────────────────────────────────────────────────

  const listRef = useRef<HTMLDivElement>(null)
  const preferencesOpenRef = useRef(ui.preferencesOpen)
  preferencesOpenRef.current = ui.preferencesOpen

  const [commandsRevision, setCommandsRevision] = useState(0)
  const [accountInitialTab, setAccountInitialTab] = useState<'conta' | 'planos' | 'cloud'>('conta')

  // ── Efeitos ────────────────────────────────────────────────────────────────

  useEffect(() => {
    document.title = BRAND_APP_NAME
  }, [])

  useEffect(() => {
    const bump = () => setCommandsRevision((n) => n + 1)
    const onForgeCommands = () => bump()
    const unsubs = [
      eventBus.on('plugin:activated', bump),
      eventBus.on('plugin:deactivated', bump),
      eventBus.on('plugin:enabled-changed', bump),
      eventBus.on('plugin:installed', bump),
      eventBus.on('plugin:discover:complete', bump),
    ]
    window.addEventListener('luna-forge-commands', onForgeCommands)
    return () => {
      unsubs.forEach((u) => u())
      window.removeEventListener('luna-forge-commands', onForgeCommands)
    }
  }, [])

  useEffect(() => {
    if (lunaFinancesActive) {
      globalThis.__lunaTrustedFinances?.registerTools()
    }
  }, [lunaFinancesActive])

  useChatScrollFollow(listRef, conv.messages, conv.activeId, {
    enabled:
      nav.primaryView === 'conversation' && nav.workbenchMode !== 'ide',
    generating: conv.messages.some((m) => m.role === 'assistant' && isAssistantGenerating(m)),
  })

  // ── Funções cruzadas ───────────────────────────────────────────────────────

  const closeSidePanels = useCallback(() => {
    const hadPreferences = preferencesOpenRef.current
    nav.setSidebarPanel('none')
    ui.setPreferencesOpen(false)
    ui.setShortcutsOpen(false)
    ui.setCommandOpen(false)
    if (hadPreferences) {
      requestAnimationFrame(() => document.getElementById('msg-input')?.focus())
    }
  }, [nav, ui])

  const openPreferences = useCallback(() => {
    nav.openConversationView()
    nav.setSidebarPanel('none')
    ui.setPreferencesOpen(true)
  }, [nav, ui])

  const openPreferencesAddons = useCallback(() => {
    nav.openConversationView()
    ui.setPreferencesOpen(false)
    try { sessionStorage.setItem('luna-preferences-section', 'addons') } catch { /* ignore */ }
    requestAnimationFrame(() => ui.setPreferencesOpen(true))
  }, [nav, ui])

  const commitTitleEdit = useCallback(() => {
    if (!conv.activeId) return
    conv.renameConversation(conv.activeId, ui.titleDraft)
    ui.setEditingTitle(false)
  }, [conv.activeId, conv.renameConversation, ui])

  const handleRedoMessage = useCallback(
    (id: string) => {
      void composer.handleRedoMessage(id)
    },
    [composer.handleRedoMessage],
  )

  const handleStarterPick = useCallback((text: string) => {
    setComposerDraft(text)
    focusComposer()
  }, [])

  const handleComposerSend = useCallback(() => {
    void composer.handleSend()
  }, [composer.handleSend])

  function focusComposer() {
    document.getElementById('msg-input')?.focus()
  }

  // ── Valores derivados ──────────────────────────────────────────────────────

  const activeConversation = conv.conversations.find((c) => c.id === conv.activeId)
  const sessionTitle = activeConversation?.title ?? 'Nova conversa'
  const chatSideLayout = nav.workbenchMode === 'ide' || nav.primaryView === 'finances'
  const financesAgentMode = nav.primaryView === 'finances'
  const lunaCoreUiMode =
    nav.workbenchMode === 'chat' || nav.workbenchMode === 'ide'
  const lunaBilling = useLunaCoreBilling()
  const billingOverdueAlert = lunarAuth.billingOverdue
    ? 'Pagamento em atraso — actualiza na Asaas para manter o teu plano.'
    : null

  const usageQuotaAlert = billingOverdueAlert
    ?? (lunaCoreUiMode && lunaBilling.planId !== 'byok'
      ? lunaBilling.usageAlertMessage
      : null)
  const usageQuotaAlertLevel = billingOverdueAlert
    ? 'warn90'
    : lunaCoreUiMode && lunaBilling.planId !== 'byok' && lunaBilling.usageAlertLevel !== 'none'
      ? lunaBilling.usageAlertLevel
      : undefined
  const financesModel = useIdeModelCatalog(financesAgentMode)
  const financesModelLabel = useMemo(() => {
    if (!financesAgentMode) return undefined
    const opt = resolveSelectedOption(
      financesModel.modelCatalog,
      financesModel.selectedModelId,
    )
    return opt ? `${opt.provider} · ${opt.label}` : 'Luna · Agente'
  }, [financesAgentMode, financesModel.modelCatalog, financesModel.selectedModelId])

  const financesActiveTab = useSyncExternalStore(
    subscribeFinancesActiveTab,
    getFinancesActiveTab,
    getFinancesActiveTab,
  )

  const welcomeVariant =
    nav.primaryView === 'finances' ? 'finances' : nav.workbenchMode === 'ide' ? 'ide' : 'chat'

  const hasUserMessages = conv.messages.some((m) => m.role === 'user')

  const welcomePanel = useMemo(
    () => {
      if (hasUserMessages) return null
      return buildWelcomePanel({
        conversation: activeConversation ?? null,
        conversations: conv.conversations,
        folders: foldersState.folders,
        userMemory: memory.userMemory,
        cloudSyncAvailable: sync.cloudSyncAvailable,
        variant: welcomeVariant,
      })
    },
    [
      hasUserMessages,
      activeConversation,
      conv.conversations,
      foldersState.folders,
      memory.userMemory,
      sync.cloudSyncAvailable,
      welcomeVariant,
      financesActiveTab,
    ],
  )

  const generating = conv.messages.some(
    (m) => m.role === 'assistant' && isAssistantGenerating(m),
  )

  const generatingPhaseMessage = [...conv.messages]
    .reverse()
    .find((m) => m.role === 'assistant' && isAssistantGenerating(m))

  const workingPhase = useMemo(() => {
    if (!generatingPhaseMessage) return undefined
    return readAssistantTurnPhase(generatingPhaseMessage)
  }, [generatingPhaseMessage])

  const composerWorkingLabel = useMemo(() => {
    if (!workingPhase) return undefined
    return t(`chatTurn.phase_${workingPhase}`)
  }, [workingPhase, t])

  // ── Paleta de comandos ─────────────────────────────────────────────────────

  const commandItems: CommandItem[] = useMemo(() => {
    const builtin: CommandItem[] = [
      { id: 'new-chat', label: t('commands.new_chat'), keywords: 'criar new', run: () => nav.startNewConversation() },
      { id: 'history', label: nav.isHistoryPanelOpen ? t('commands.close_history') : t('commands.open_history'), run: nav.toggleHistory },
      { id: 'memories', label: nav.isMemoriesPanelOpen ? t('commands.close_memories') : t('commands.open_memories'), run: nav.toggleMemories },
      { id: 'marketplace', label: t('commands.open_marketplace'), keywords: 'loja addons plugins extensões store', run: nav.openMarketplace },
      { id: 'settings', label: t('commands.settings'), run: openPreferences },
      { id: 'export', label: t('commands.export'), run: () => { if (activeConversation) downloadConversationMarkdown(activeConversation) } },
    ]
    const fromRegistry = commandRegistry.list().map((c) => ({ id: c.id, label: c.label, keywords: c.keywords, run: c.run }))
    return [...builtin, ...fromRegistry]
  }, [
    t,
    nav.isHistoryPanelOpen,
    nav.isMemoriesPanelOpen,
    activeConversation,
    nav.toggleHistory,
    nav.toggleMemories,
    nav.startNewConversation,
    nav.openMarketplace,
    openPreferences,
    ui.commandOpen,
    commandsRevision,
  ])

  // ── Atalhos de teclado ─────────────────────────────────────────────────────

  usePluginKeyboardShortcuts(!ui.preferencesOpen)

  useAppKeyboardShortcuts({
    onSend: () => void composer.handleSend(),
    onNewConversation: () => nav.startNewConversation(),
    onToggleHistory: nav.toggleHistory,
    onToggleMemories: nav.toggleMemories,
    onOpenCommandPalette: () => ui.setCommandOpen(true),
    onOpenPreferences: openPreferences,
    onOpenShortcutsHelp: () => ui.setShortcutsOpen(true),
    onCycleTheme: ui.cycleTheme,
    onCloseOverlays: closeSidePanels,
    composerBusy: composer.composerBusy,
  })

  // ── Painéis laterais ───────────────────────────────────────────────────────

  const historyPanelNode = useMemo(() => {
    if (!panelRegistry.get(SIDEBAR_PANEL_IDS[0])) return null
    const ideScope = nav.workbenchMode === 'ide'
    return (
      <HistoryPanel
        embedded
        open
        conversations={conv.conversations}
        folders={foldersState.folders}
        activeId={conv.activeId}
        conversationScope={
          ideScope
            ? { mode: 'ide', workspaceRoot: workspace.workspaceRoot }
            : { mode: 'chat' }
        }
        flatList={ideScope}
        header={
          ideScope ? (
            <IdeWorkspaceHeader
              workspaceRoot={workspace.workspaceRoot}
              conversations={conv.conversations}
            />
          ) : undefined
        }
        onSelect={(id) => {
          conv.selectConversation(id)
        }}
        onDelete={conv.deleteConversationById}
        onNewConversation={(inFolderId) =>
          nav.startNewConversation(
            inFolderId ? { folderId: inFolderId } : undefined,
          )
        }
        onRenameConversation={conv.renameConversation}
        onMoveConversation={conv.moveConversationToFolder}
        onSetConversationTags={conv.setConversationTags}
        onCreateFolder={foldersState.createFolder}
        onRenameFolder={foldersState.renameFolder}
        onUpdateFolder={foldersState.updateFolder}
        onDeleteFolder={foldersState.deleteFolder}
        onTogglePin={conv.togglePinConversation}
        cloudSyncAvailable={sync.cloudSyncAvailable}
        onSetConversationCloudEnabled={sync.setConversationCloudEnabled}
        onSetFolderCloudEnabled={sync.setFolderCloudEnabled}
        onClose={closeSidePanels}
      />
    )
  }, [
    conv.conversations,
    conv.activeId,
    conv.selectConversation,
    conv.deleteConversationById,
    conv.renameConversation,
    conv.moveConversationToFolder,
    conv.setConversationTags,
    conv.togglePinConversation,
    foldersState.folders,
    foldersState.createFolder,
    foldersState.renameFolder,
    foldersState.updateFolder,
    foldersState.deleteFolder,
    sync.cloudSyncAvailable,
    sync.setConversationCloudEnabled,
    sync.setFolderCloudEnabled,
    nav.workbenchMode,
    workspace.workspaceRoot,
    closeSidePanels,
    nav.startNewConversation,
  ])

  const memoriesPanelNode = panelRegistry.get(SIDEBAR_PANEL_IDS[1]) ? (
    <MemoriesPanel
      embedded
      open
      notes={memory.userMemory.memoryNotes ?? []}
      memoryUi={memory.userMemory.memoryUi}
      onDeleteNote={memory.deleteMemoryNote}
      onUpdateNote={memory.updateMemoryNote}
      onClose={closeSidePanels}
    />
  ) : null

  // ── Coluna de chat (sempre Luna) ───────────────────────────────────────────

  const chatColumnVariant =
    nav.primaryView === 'finances' ? 'finances' : chatSideLayout ? 'ide' : 'chat'

  const chatColumn = useMemo(
    () => (
    <ChatColumn
      header={
        <ChatSessionHeader
          compact={chatSideLayout}
          sessionTitle={sessionTitle}
          editingTitle={ui.editingTitle}
          titleDraft={ui.titleDraft}
          onTitleDraftChange={ui.setTitleDraft}
          onCommit={commitTitleEdit}
          onCancel={() => ui.setEditingTitle(false)}
          onDoubleClick={() => { ui.setTitleDraft(sessionTitle); ui.setEditingTitle(true) }}
          personalityId={model.personalityId}
          onPersonalityChange={model.setPersonality}
          onNewConversation={() => nav.startNewConversation()}
          onExportConversation={activeConversation ? () => downloadConversationMarkdown(activeConversation) : undefined}
          disabled={composer.composerBusy}
        />
      }
      compactionBanner={
        conv.activeId && activeConversation?.memory?.summarizedThroughMessageId ? (
          <ContextCompactionNotice
            conversationId={conv.activeId}
            summarizedThroughMessageId={activeConversation.memory.summarizedThroughMessageId}
            onClearConversationMemory={conv.clearActiveConversationMemory}
          />
        ) : undefined
      }
      messages={
        <ChatMessageColumn
          variant={chatColumnVariant}
          listRef={listRef}
          messages={conv.messages}
          memoryNotes={memory.userMemory.memoryNotes}
          composerBusy={composer.composerBusy}
          generating={generating}
          canRedoMessage={conv.canRedoMessage}
          onRedoMessage={handleRedoMessage}
          welcomeContext={welcomePanel}
          onOpenConversation={conv.selectConversation}
          onStarterPick={handleStarterPick}
          showOnboarding={ui.showOnboarding && nav.workbenchMode === 'chat'}
          onDismissOnboarding={ui.dismissShowOnboarding}
        />
      }
      footer={
        <ChatShellFooter
          showPendingChanges={
            nav.workbenchMode === 'ide' && nav.primaryView !== 'finances'
          }
          onSend={handleComposerSend}
          onKeyDown={composer.handleKeyDown}
          composerBusy={composer.composerBusy}
          workingLabel={composerWorkingLabel}
          workingPhase={workingPhase}
          onStop={conv.cancelAgentTurn}
          reasoningEnabled={model.reasoningEnabled}
          onReasoningChange={model.setReasoningEnabled}
          modelLabel={
            financesAgentMode
              ? financesModelLabel
              : lunaCoreUiMode
                ? `${SIMPLE_CHAT_PROVIDER_LABEL} · ${SIMPLE_CHAT_MODEL_LABEL}`
                : undefined
          }
          reasoningUnsupportedMsg={
            lunaCoreUiMode
              ? 'O raciocínio vem do pipeline Luna Core — este toggle será removido em breve.'
              : undefined
          }
          workbenchMode={nav.workbenchMode}
          primaryView={nav.primaryView}
          serverOk={serverOk}
          serverChecking={serverChecking}
          activeId={conv.activeId}
          messages={conv.messages}
          conversations={conv.conversations}
          conversationMemory={activeConversation?.memory}
          userMemory={memory.userMemory}
          personalityId={model.personalityId}
          financesAgentMode={financesAgentMode}
          modelCatalog={financesModel.modelCatalog}
          selectedModelId={financesModel.selectedModelId}
          fixedModelLabel={
            lunaCoreUiMode
              ? `${SIMPLE_CHAT_PROVIDER_LABEL} · ${SIMPLE_CHAT_MODEL_LABEL}`
              : undefined
          }
          onOpenLunarAccount={() => { setAccountInitialTab('conta'); lunarAuth.openGate() }}
          onOpenBilling={() => { setAccountInitialTab('planos'); lunarAuth.openGate() }}
          usageQuotaAlert={usageQuotaAlert}
          usageQuotaAlertLevel={usageQuotaAlertLevel}
        />
      }
    />
  ),
  [
    chatSideLayout,
    sessionTitle,
    ui.editingTitle,
    ui.titleDraft,
    commitTitleEdit,
    ui.setTitleDraft,
    ui.setEditingTitle,
    model.personalityId,
    model.setPersonality,
    nav.startNewConversation,
    activeConversation,
    conv.activeId,
    conv.messages,
    conv.conversations,
    conv.canRedoMessage,
    conv.clearActiveConversationMemory,
    conv.cancelAgentTurn,
    conv.selectConversation,
    memory.userMemory.memoryNotes,
    composer.composerBusy,
    composer.handleKeyDown,
    handleComposerSend,
    generating,
    handleRedoMessage,
    welcomePanel,
    handleStarterPick,
    ui.showOnboarding,
    nav.workbenchMode,
    ui.dismissShowOnboarding,
    chatColumnVariant,
    composerWorkingLabel,
    workingPhase,
    model.reasoningEnabled,
    model.setReasoningEnabled,
    financesAgentMode,
    financesModelLabel,
    lunaCoreUiMode,
    lunaBilling.planId,
    usageQuotaAlert,
    usageQuotaAlertLevel,
    nav.primaryView,
    serverOk,
    serverChecking,
    activeConversation?.memory,
    financesModel.modelCatalog,
    financesModel.selectedModelId,
    lunarAuth.openGate,
  ],
  )

  // ── Render guard ───────────────────────────────────────────────────────────

  if (!hydrated) return <AppBootSkeleton />

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {lunarAuth.gateOpen ? (
        <LunarGateScreen
          initialTab={accountInitialTab}
          onClose={() => { lunarAuth.closeGate(); setAccountInitialTab('conta') }}
        />
      ) : null}
      <ToastHost />
      <ConfirmDialog />
      <CpfCnpjDialog />
      <ShortcutsHelpModal open={ui.shortcutsOpen} onClose={() => ui.setShortcutsOpen(false)} />
      <CommandPalette
        open={ui.commandOpen}
        onClose={() => ui.setCommandOpen(false)}
        commands={commandItems}
      />

      <LunaBadgeNavigationProvider
        listRef={listRef}
        onOpenMemories={nav.openMemoriesPanel}
        onOpenHistory={nav.openHistoryPanel}
        onCloseSidePanels={closeSidePanels}
      >
        <MainLayout
          compact={
            lunaIdeActive &&
            nav.workbenchMode === 'ide' &&
            Boolean(workspace.workspaceRoot?.trim())
          }
          titleBar={<TitleBar />}
          sidebar={
            /* Sidebar sempre visível — exceto no modo IDE (layout próprio) */
            nav.workbenchMode !== 'ide' ? (
              <AppSidebar
                primaryView={nav.primaryView}
                workbenchMode={nav.workbenchMode}
                ideAddonActive={lunaIdeActive}
                financesAddonActive={lunaFinancesActive}
                sidebarPanel={nav.sidebarPanel}
                historyPanel={historyPanelNode ?? <div />}
                memoriesPanel={memoriesPanelNode ?? <div />}
                onNewConversation={() => { nav.openConversationView(); nav.startNewConversation() }}
                onWorkbenchModeChange={nav.handleWorkbenchModeChange}
                onOpenMarketplace={nav.openMarketplace}
                onOpenFinances={nav.openFinances}
                onOpenConversation={nav.openConversationView}
                onOpenAccount={() => lunarAuth.openGate()}
                onTogglePreferences={() => {
                  if (ui.preferencesOpen) ui.setPreferencesOpen(false)
                  else openPreferences()
                }}
                preferencesOpen={ui.preferencesOpen}
                onShowHistory={() => nav.setSidebarPanel('history')}
                onShowMemories={() => nav.setSidebarPanel('memories')}
              />
            ) : undefined
          }
        >
          {nav.primaryView === 'marketplace' ? (
            <MarketplacePage onManageAddons={openPreferencesAddons} />
          ) : nav.primaryView === 'finances' ? (
            <FinancesPage chatPanel={chatColumn} />
          ) : lunaIdeActive && nav.workbenchMode === 'ide' ? (
            <IdeWorkbench
              chatPanel={chatColumn}
              filesPanel={<FileExplorer />}
              historyPanel={historyPanelNode ?? <div />}
              memoriesPanel={memoriesPanelNode ?? <div />}
              recentWorkspaces={conv.recentWorkspaces}
              conversations={conv.conversations}
              onSwitchToChat={() => { nav.openConversationView(); nav.handleWorkbenchModeChange('chat') }}
            />
          ) : (
            chatColumn
          )}

        </MainLayout>
      </LunaBadgeNavigationProvider>

      {ui.preferencesOpen ? (
        <>
          {/* Scrim blocks pointer events on content behind the panel */}
          <div className="fixed inset-0 z-[48] bg-black/30" aria-hidden />
          <div
            className="luna-overlay-enter luna-surface-panel fixed inset-0 z-[49] m-2 flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label={t('shell.settings')}
          >
            <PreferencesView
              disabled={composer.composerBusy}
              themeId={ui.themeId}
              onThemeChange={ui.setThemeId}
              streamingEnabled={ui.streamingEnabled}
              onStreamingChange={ui.setStreamingEnabled}
              ragEnabled={model.ragEnabled}
              onRagEnabledChange={model.setRagEnabled}
              reasoningEnabled={model.reasoningEnabled}
              onReasoningChange={model.setReasoningEnabled}
              personalityId={model.personalityId}
              onPersonalityChange={model.setPersonality}
              memoryCrossChatEnabled={memory.memoryCrossChatEnabled}
              onMemoryCrossChatToggle={() => memory.setMemoryCrossChatEnabled(!memory.memoryCrossChatEnabled)}
              memoryConversationSearchEnabled={memory.memoryConversationSearchEnabled}
              onMemoryConversationSearchToggle={() =>
                memory.setConversationSearchEnabled(!memory.memoryConversationSearchEnabled)}
              onOpenMarketplace={nav.openMarketplace}
              workbenchMode={nav.workbenchMode}
              onClose={() => {
                ui.setPreferencesOpen(false)
                requestAnimationFrame(() => document.getElementById('msg-input')?.focus())
              }}
            />
          </div>
        </>
      ) : null}
    </>
  )
}
