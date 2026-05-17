import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { LunaBadgeNavigationProvider } from './context/LunaBadgeNavigation'
import { ActivityBar } from './components/ActivityBar'
import { AppBootSkeleton } from './components/AppBootSkeleton'
import { ChatComposer } from './components/ChatComposer'
import { ChatMessageColumn } from './components/chat/ChatMessageColumn'
import { CommandPalette, type CommandItem } from './components/CommandPalette'
import { HistoryPanel } from './components/HistoryPanel'
import { MemoriesPanel } from './components/MemoriesPanel'
import { dismissOnboarding, readOnboardingDismissed } from './components/OnboardingCard'
import { RagControls } from './components/RagControls'
import { SettingsDrawer } from './components/SettingsDrawer'
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal'
import { StatusBar } from './components/StatusBar'
import { ChatSessionToolbar } from './components/ChatSessionToolbar'
import { ConfirmDialog } from './components/ui/ConfirmDialog'
import { ToastHost } from './components/ui/ToastHost'
import { isAssistantGenerating } from './lib/assistantMessageUi'
import { downloadConversationMarkdown } from './lib/exportConversation'
import { TitleBar } from './components/TitleBar'
import { IdeWorkbench } from './components/ide/IdeWorkbench'
import { BRAND_APP_NAME } from './brand'
import { useAppKeyboardShortcuts } from './hooks/useAppKeyboardShortcuts'
import { useConversations } from './hooks/useConversations'
import { useServerHealth } from './hooks/useServerHealth'
import type { PreparedImageAttachment } from './lib/imageResize'
import { bridgeSetWorkbenchLayout } from './lib/lunaBridge'
import {
  readWorkbenchMode,
  writeWorkbenchMode,
  type LunaWorkbenchMode,
} from './lib/workbenchMode'

export default function App() {
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
    modelCatalog,
    selectedModelId,
    setSelectedModelId,
    modelCatalogLoading,
    modelCatalogError,
  } = useConversations()

  const [attachedImages, setAttachedImages] = useState<PreparedImageAttachment[]>([])
  const [composerBusy, setComposerBusy] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [memoriesOpen, setMemoriesOpen] = useState(false)
  const [composerMenuOpen, setComposerMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(() => !readOnboardingDismissed())
  const [workbenchMode, setWorkbenchMode] = useState<LunaWorkbenchMode>(readWorkbenchMode)

  const listRef = useRef<HTMLDivElement>(null)
  const prevActiveIdRef = useRef<string | null>(activeId)
  const { serverOk, checking: serverChecking } = useServerHealth()

  const activeConversation = conversations.find((c) => c.id === activeId)
  const sessionTitle = activeConversation?.title ?? 'Nova conversa'
  const generating = messages.some(
    (m) => m.role === 'assistant' && isAssistantGenerating(m),
  )

  useEffect(() => {
    document.title = BRAND_APP_NAME
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
    setHistoryOpen(false)
    setMemoriesOpen(true)
  }, [])

  const closeSidePanels = useCallback(() => {
    setHistoryOpen(false)
    setMemoriesOpen(false)
    setSettingsOpen(false)
    setShortcutsOpen(false)
    setCommandOpen(false)
  }, [])

  const handleWorkbenchModeChange = useCallback((mode: LunaWorkbenchMode) => {
    setWorkbenchMode(mode)
    writeWorkbenchMode(mode)
    void bridgeSetWorkbenchLayout(mode)
    if (mode === 'ide') {
      setHistoryOpen(false)
      setMemoriesOpen(false)
    }
  }, [])

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
    setHistoryOpen(false)
    setMemoriesOpen(false)
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
  }

  const commandItems: CommandItem[] = useMemo(
    () => [
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
        label: historyOpen ? 'Fechar histórico' : 'Abrir histórico',
        run: () => setHistoryOpen((v) => !v),
      },
      {
        id: 'settings',
        label: 'Definições',
        run: () => setSettingsOpen(true),
      },
      {
        id: 'export',
        label: 'Exportar conversa (Markdown)',
        run: () => {
          if (activeConversation) downloadConversationMarkdown(activeConversation)
        },
      },
    ],
    [
      workbenchMode,
      historyOpen,
      activeConversation,
      createConversation,
      handleWorkbenchModeChange,
    ],
  )

  useAppKeyboardShortcuts({
    onSend: () => void handleSend(),
    onNewConversation: () => createConversation(),
    onToggleHistory: () => setHistoryOpen((v) => !v),
    onToggleMemories: () => setMemoriesOpen((v) => !v),
    onToggleWorkbench: () =>
      handleWorkbenchModeChange(workbenchMode === 'ide' ? 'chat' : 'ide'),
    onOpenCommandPalette: () => setCommandOpen(true),
    onOpenShortcutsHelp: () => setShortcutsOpen(true),
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
            onOpenSettings={() => setSettingsOpen(true)}
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
    <>
      {headerBlock(workbenchMode === 'ide')}
      {workbenchMode === 'chat' ? (
        <RagControls ragEnabled={ragEnabled} onRagEnabledChange={setRagEnabled} />
      ) : null}
      {messageList}
      <ChatComposer {...composerProps} />
      <StatusBar
        workbenchMode={workbenchMode}
        modelCatalog={modelCatalog}
        selectedModelId={selectedModelId}
        serverOk={serverOk}
        serverChecking={serverChecking}
      />
    </>
  )

  if (!hydrated) {
    return <AppBootSkeleton />
  }

  return (
    <>
      <ToastHost />
      <ConfirmDialog />
      <ShortcutsHelpModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        commands={commandItems}
      />
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        ragEnabled={ragEnabled}
        onRagEnabledChange={setRagEnabled}
        reasoningEnabled={reasoningEnabled}
        onReasoningChange={setReasoningEnabled}
        personalityId={personalityId}
        onPersonalityChange={setPersonality}
        memoryCrossChatEnabled={memoryCrossChatEnabled}
        onMemoryCrossChatToggle={() =>
          setMemoryCrossChatEnabled(!memoryCrossChatEnabled)
        }
        memoryConversationSearchEnabled={memoryConversationSearchEnabled}
        onMemoryConversationSearchToggle={() =>
          setConversationSearchEnabled(!memoryConversationSearchEnabled)
        }
        disabled={composerBusy}
      />

      <div className="flex h-screen flex-col overflow-hidden bg-canvas">
        <TitleBar />

        <div className="flex min-h-0 flex-1">
          <LunaBadgeNavigationProvider
            listRef={listRef}
            onOpenMemories={openMemoriesPanel}
            onCloseSidePanels={closeSidePanels}
          >
            <ActivityBar
              workbenchMode={workbenchMode}
              onWorkbenchModeChange={handleWorkbenchModeChange}
              historyOpen={historyOpen}
              onToggleHistory={() => {
                setHistoryOpen((v) => {
                  const next = !v
                  if (next) setMemoriesOpen(false)
                  return next
                })
              }}
              memoriesOpen={memoriesOpen}
              onToggleMemories={() => {
                setMemoriesOpen((v) => {
                  const next = !v
                  if (next) setHistoryOpen(false)
                  return next
                })
              }}
              onNewChat={() => createConversation()}
              onFocusCurrentChat={focusCurrentChat}
            />

            {workbenchMode === 'chat' ? (
              <MemoriesPanel
                open={memoriesOpen}
                notes={userMemory.memoryNotes ?? []}
                memoryUi={userMemory.memoryUi}
                onDeleteNote={deleteMemoryNote}
                onClose={closeSidePanels}
              />
            ) : null}

            {workbenchMode === 'chat' ? (
              <HistoryPanel
                open={historyOpen}
                conversations={conversations}
                folders={folders}
                activeId={activeId}
                onSelect={(id) => {
                  selectConversation(id)
                  closeSidePanels()
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
            ) : null}

            {workbenchMode === 'ide' ? (
              <IdeWorkbench chatPanel={chatColumn} />
            ) : (
              <div className="relative flex min-w-0 flex-1 flex-col bg-canvas">
                {chatColumn}
              </div>
            )}
          </LunaBadgeNavigationProvider>
        </div>
      </div>
    </>
  )
}
