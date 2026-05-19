import type { ReactNode } from 'react'
import type { LunaPrimaryView } from '../lib/primaryView'
import type { LunaWorkbenchMode } from '../lib/workbenchMode'
import type { SidebarPanel } from '../lib/sidebarPanel'
import { isHistoryOpen, isMemoriesOpen } from '../lib/sidebarPanel'
import { panelRegistry } from '../core/registry/PanelRegistry'
import { LunarAccountChip } from './lunar/LunarAccountChip'
import { Tooltip } from './ui/Tooltip'

type Props = {
  workbenchMode: LunaWorkbenchMode
  primaryView: LunaPrimaryView
  onWorkbenchModeChange: (mode: LunaWorkbenchMode) => void
  onOpenMarketplace: () => void
  onOpenConversation: () => void
  onNewChat: () => void
  sidebarPanel: SidebarPanel
  onToggleHistory: () => void
  onToggleMemories: () => void
  preferencesOpen: boolean
  onTogglePreferences: () => void
  onFocusCurrentChat: () => void
  onOpenLunarAccount: () => void
}

const iconBtn =
  'flex size-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-raised-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar'

const iconBtnActive = 'bg-accent-muted text-accent shadow-sm'

function NavSection({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div
      className="flex flex-col items-center gap-1"
      role="group"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

export function ActivityBar({
  workbenchMode,
  primaryView,
  onWorkbenchModeChange,
  onOpenMarketplace,
  onOpenConversation,
  onNewChat,
  sidebarPanel,
  onToggleHistory,
  onToggleMemories,
  preferencesOpen,
  onTogglePreferences,
  onFocusCurrentChat,
  onOpenLunarAccount,
}: Props) {
  const pluginPanels = panelRegistry.list()
  const historyOpen = isHistoryOpen(sidebarPanel)
  const memoriesOpen = isMemoriesOpen(sidebarPanel)
  const inIde = workbenchMode === 'ide'
  const marketplaceOpen = primaryView === 'marketplace'

  const historyTip = historyOpen
    ? 'Fechar lista de conversas'
    : inIde
      ? 'Abrir conversas no painel esquerdo (aba Conversas)'
      : 'Abrir conversas à esquerda do chat'

  const memoriesTip = memoriesOpen
    ? 'Fechar memórias'
    : inIde
      ? 'Abrir memórias no painel esquerdo (aba Memórias)'
      : 'Abrir memórias à esquerda do chat'

  const focusTip = inIde
    ? 'Ir ao fim do chat integrado e focar o campo de mensagem'
    : 'Ir ao fim da conversa e focar o campo de mensagem'

  return (
    <aside
      className="relative z-20 flex h-full w-11 shrink-0 flex-col items-center gap-2 overflow-visible border-r border-line bg-sidebar py-2"
      aria-label="Menu principal"
    >
      {pluginPanels.length > 0 ? (
        <span className="sr-only">
          {pluginPanels.map((p) => p.label).join(', ')}
        </span>
      ) : null}

      <NavSection label="Modo de trabalho">
        <Tooltip label="Modo conversa — chat em ecrã inteiro" side="right">
          <button
            type="button"
            className={`${iconBtn} ${
              workbenchMode === 'chat' && !marketplaceOpen ? iconBtnActive : ''
            }`}
            aria-label="Modo conversa"
            aria-pressed={workbenchMode === 'chat' && !marketplaceOpen}
            onClick={() => {
              onOpenConversation()
              onWorkbenchModeChange('chat')
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="stroke-current"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M12 3a7 7 0 0 0-7 7v4l-3 3h8a7 7 0 1 0 7-7Z" />
            </svg>
          </button>
        </Tooltip>

        <Tooltip
          label="Modo IDE — editor, terminal e chat lateral"
          side="right"
          maxWidth="17rem"
        >
          <button
            type="button"
            className={`${iconBtn} ${
              workbenchMode === 'ide' && !marketplaceOpen ? iconBtnActive : ''
            }`}
            aria-label="Modo IDE"
            aria-pressed={workbenchMode === 'ide' && !marketplaceOpen}
            onClick={() => {
              onOpenConversation()
              onWorkbenchModeChange('ide')
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="stroke-current"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M8 3h8l4 4v14H4V7l4-4z" />
              <path d="M12 3v4h4" />
              <path d="M8 13h8" />
              <path d="M8 17h5" />
            </svg>
          </button>
        </Tooltip>
      </NavSection>

      <div className="h-px w-6 bg-line" aria-hidden />

      <NavSection label="Loja">
        <Tooltip
          label="Marketplace — explorar e instalar add-ons"
          side="right"
          maxWidth="17rem"
        >
          <button
            type="button"
            className={`${iconBtn} ${marketplaceOpen ? iconBtnActive : ''}`}
            aria-label="Marketplace"
            aria-pressed={marketplaceOpen}
            onClick={onOpenMarketplace}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="stroke-current"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 9h18v12H3z" />
              <path d="M3 9l2-4h14l2 4" />
              <path d="M9 13v4" />
              <path d="M15 13v4" />
            </svg>
          </button>
        </Tooltip>
      </NavSection>

      <div className="h-px w-6 bg-line" aria-hidden />

      <NavSection label="Conversa">
        <Tooltip label={focusTip} side="right" maxWidth="16rem">
          <button
            type="button"
            className={iconBtn}
            aria-label="Focar campo de mensagem"
            onClick={onFocusCurrentChat}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="stroke-current"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 5v14" />
              <path d="m6 11 6 6 6-6" />
            </svg>
          </button>
        </Tooltip>

        <Tooltip label={memoriesTip} side="right" maxWidth="17rem">
          <button
            type="button"
            className={`${iconBtn} ${memoriesOpen ? iconBtnActive : ''}`}
            aria-label="Memórias da Luna"
            aria-expanded={memoriesOpen}
            aria-pressed={memoriesOpen}
            onClick={onToggleMemories}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="stroke-current"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <path d="M8 7h8" />
              <path d="M8 11h8" />
              <path d="M8 15h4" />
            </svg>
          </button>
        </Tooltip>

        <Tooltip label={historyTip} side="right" maxWidth="17rem">
          <button
            type="button"
            className={`${iconBtn} ${historyOpen ? iconBtnActive : ''}`}
            aria-label="Lista de conversas"
            aria-expanded={historyOpen}
            aria-pressed={historyOpen}
            onClick={onToggleHistory}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="stroke-current"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M8 6h13" />
              <path d="M8 12h13" />
              <path d="M8 18h13" />
              <path d="M3 6h.01" />
              <path d="M3 12h.01" />
              <path d="M3 18h.01" />
            </svg>
          </button>
        </Tooltip>

        <Tooltip label="Nova conversa" side="right">
          <button
            type="button"
            className={iconBtn}
            aria-label="Começar conversa nova"
            onClick={onNewChat}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="stroke-current"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </Tooltip>
      </NavSection>

      <div className="mt-auto flex w-full flex-col items-center">
        <div className="mb-2 h-px w-6 bg-line" aria-hidden />
        <NavSection label="Conta Lunar">
          <Tooltip
            label="Conta Lunar — login, sync e modelos na nuvem"
            side="right"
            maxWidth="17rem"
          >
            <LunarAccountChip
              variant="activity"
              onOpenAccount={onOpenLunarAccount}
            />
          </Tooltip>
        </NavSection>
        <div className="mb-2 mt-2 h-px w-6 bg-line" aria-hidden />
        <NavSection label="Aplicação">
          <Tooltip
            label={
              preferencesOpen
                ? 'Fechar definições'
                : 'Definições — abre por cima do trabalho actual'
            }
            side="right"
            maxWidth="17rem"
          >
            <button
              type="button"
              className={`${iconBtn} ${preferencesOpen ? iconBtnActive : ''}`}
              aria-label="Definições da aplicação"
              aria-expanded={preferencesOpen}
              aria-pressed={preferencesOpen}
              onClick={onTogglePreferences}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="stroke-current"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </button>
          </Tooltip>
        </NavSection>
      </div>
    </aside>
  )
}
