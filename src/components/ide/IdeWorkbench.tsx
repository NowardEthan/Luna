import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Conversation } from '../../types/chat'
import { ForgeLayoutProvider, useForgeLayout } from '../../context/ForgeLayoutContext'
import { useLunaWorkspace } from '../../context/LunaWorkspaceContext'
import { ResizableSplit } from '../ui/ResizableSplit'
import { ForgeEditorArea } from './forge/ForgeEditorArea'
import { LunaForgeHome } from './LunaForgeHome'
import { ForgeActivityBar } from './forge/ForgeActivityBar'
import { ForgeBottomPanel } from './forge/ForgeBottomPanel'
import { ForgeSidebar } from './forge/ForgeSidebar'
import { ForgeStatusBar } from './forge/ForgeStatusBar'
import { ForgeQuickOpen } from './forge/ForgeQuickOpen'
import { ForgeChatPanel } from './forge/ForgeChatPanel'
import { useForgeKeyboardShortcuts } from '../../hooks/useForgeKeyboardShortcuts'
import { useForgePatchAutoOpen } from '../../hooks/useForgePatchAutoOpen'
import { useForgeEntryLayout } from '../../hooks/useForgeEntryLayout'
import { useForgeCommands } from '../../features/ide/useForgeCommands'

type Props = {
  chatPanel: ReactNode
  filesPanel: ReactNode
  historyPanel: ReactNode
  memoriesPanel: ReactNode
  recentWorkspaces: string[]
  conversations: Conversation[]
  onSwitchToChat: () => void
}

function ForgeWorkbenchLayout({
  chatPanel,
  filesPanel,
  historyPanel,
  memoriesPanel,
  onSwitchToChat,
}: Omit<Props, 'recentWorkspaces' | 'conversations'>) {
  const { t } = useTranslation()
  const forge = useForgeLayout()
  useForgeKeyboardShortcuts(true)
  useForgePatchAutoOpen(true)
  useForgeEntryLayout(true)
  useForgeCommands(true)

  const collapsedPanelBtn = (
    <button
      type="button"
      onClick={() => forge.setBottomPanelOpen(true)}
      className="absolute bottom-2 right-3 rounded-md border border-line-subtle bg-sidebar/90 px-2 py-1 text-[10px] text-fg-muted shadow-sm hover:text-fg"
    >
      {t('forge.status.showPanel')}
    </button>
  )

  const mainArea = forge.aiPanelOpen ? (
    <ResizableSplit
      className="h-full min-h-0 min-w-0 flex-1"
      storageKey="forge-ai"
      defaultLeadingSize={640}
      defaultLeadingRatio={0.55}
      minLeading={360}
      minTrailing={320}
      leading={
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {forge.bottomPanelOpen ? (
            <ResizableSplit
              className="min-h-0 flex-1"
              direction="vertical"
              storageKey="forge-bottom"
              defaultLeadingSize={520}
              defaultLeadingRatio={0.72}
              minLeading={200}
              minTrailing={120}
              leading={
                <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
                  <ForgeEditorArea />
                </div>
              }
              trailing={<ForgeBottomPanel />}
            />
          ) : (
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <ForgeEditorArea />
              {collapsedPanelBtn}
            </div>
          )}
          <ForgeStatusBar />
        </div>
      }
      trailing={
        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-l border-line-subtle bg-canvas">
          <header className="flex shrink-0 items-center justify-between border-b border-line-subtle bg-sidebar/50 px-3 py-2">
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-fg">
                {t('forge.ai.title')}
              </span>
              <p className="text-[10px] text-fg-muted">{t('forge.ai.hint')}</p>
            </div>
            <button
              type="button"
              onClick={() => forge.toggleAiPanel()}
              className="luna-btn-ghost rounded p-1 text-fg-muted hover:text-fg"
              aria-label={t('forge.ai.close')}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className="stroke-current"
                strokeWidth="2"
                aria-hidden
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </header>
          <ForgeChatPanel>{chatPanel}</ForgeChatPanel>
        </div>
      }
    />
  ) : (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {forge.bottomPanelOpen ? (
        <ResizableSplit
          className="min-h-0 flex-1"
          direction="vertical"
          storageKey="forge-bottom"
          defaultLeadingSize={520}
          defaultLeadingRatio={0.72}
          minLeading={200}
          minTrailing={120}
          leading={
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
              <ForgeEditorArea />
            </div>
          }
          trailing={<ForgeBottomPanel />}
        />
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <ForgeEditorArea />
          {collapsedPanelBtn}
        </div>
      )}
      <ForgeStatusBar />
    </div>
  )

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
      <ForgeQuickOpen />
      <ForgeActivityBar onSwitchToChat={onSwitchToChat} />

      <ResizableSplit
        className="min-h-0 min-w-0 flex-1"
        storageKey="forge-sidebar"
        defaultLeadingSize={260}
        defaultLeadingRatio={0.18}
        minLeading={200}
        minTrailing={400}
        leadingSize={forge.sidebarOpen ? undefined : 0}
        resizable={forge.sidebarOpen}
        leading={
          <ForgeSidebar
            files={filesPanel}
            history={historyPanel}
            memories={memoriesPanel}
          />
        }
        trailing={mainArea}
      />
    </div>
  )
}

export function IdeWorkbench({
  chatPanel,
  filesPanel,
  historyPanel,
  memoriesPanel,
  recentWorkspaces,
  conversations,
  onSwitchToChat,
}: Props) {
  const ws = useLunaWorkspace()
  const hasProject = Boolean(ws.workspaceRoot?.trim())

  if (!hasProject) {
    return (
      <LunaForgeHome
        recentWorkspaces={recentWorkspaces}
        conversations={conversations}
        onOpenFolder={() => void ws.openFolder()}
        onOpenRecent={(path) => void ws.openWorkspacePath(path)}
        onSwitchToChat={onSwitchToChat}
      />
    )
  }

  return (
    <ForgeLayoutProvider>
      <ForgeWorkbenchLayout
        chatPanel={chatPanel}
        filesPanel={filesPanel}
        historyPanel={historyPanel}
        memoriesPanel={memoriesPanel}
        onSwitchToChat={onSwitchToChat}
      />
    </ForgeLayoutProvider>
  )
}
