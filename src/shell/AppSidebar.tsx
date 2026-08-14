import type { ReactNode } from 'react'
import { useLunaAuth } from '../features/auth/AuthProvider'
import { PLAN_DISPLAY_LABELS } from '../features/billing/plans'
import type { LunaPrimaryView } from '../lib/primaryView'
import type { LunaWorkbenchMode } from '../lib/workbenchMode'

// ── Icons ──────────────────────────────────────────────────────────────────

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconChat() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M12 3a7 7 0 0 0-7 7v4l-3 3h8a7 7 0 1 0 7-7Z" />
    </svg>
  )
}

function IconIde() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
}

function IconMarketplace() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 9h18v12H3z" />
      <path d="M3 9l2-4h14l2 4" />
      <path d="M9 13v4" />
      <path d="M15 13v4" />
    </svg>
  )
}

function IconFinances() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

// ── Nav item helper ────────────────────────────────────────────────────────

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium transition-colors',
        active
          ? 'bg-raised text-fg'
          : 'text-fg-muted hover:bg-raised/60 hover:text-fg',
      ].join(' ')}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
  )
}

// ── Types ──────────────────────────────────────────────────────────────────

type Props = {
  primaryView: LunaPrimaryView
  workbenchMode: LunaWorkbenchMode
  ideAddonActive: boolean
  financesAddonActive: boolean
  /** Controla qual tab está ativa. 'none' → default para 'history'. */
  sidebarPanel: 'none' | 'history' | 'memories'
  historyPanel: ReactNode
  memoriesPanel: ReactNode
  onNewConversation: () => void
  onWorkbenchModeChange: (mode: LunaWorkbenchMode) => void
  onOpenMarketplace: () => void
  onOpenFinances: () => void
  onOpenConversation: () => void
  onOpenAccount: () => void
  onTogglePreferences: () => void
  preferencesOpen: boolean
  onShowHistory: () => void
  onShowMemories: () => void
}

// ── Component ──────────────────────────────────────────────────────────────

export function AppSidebar({
  primaryView,
  workbenchMode,
  ideAddonActive,
  financesAddonActive,
  sidebarPanel,
  historyPanel,
  memoriesPanel,
  onNewConversation,
  onWorkbenchModeChange,
  onOpenMarketplace,
  onOpenFinances,
  onOpenConversation,
  onOpenAccount,
  onTogglePreferences,
  preferencesOpen,
  onShowHistory,
  onShowMemories,
}: Props) {
  const auth = useLunaAuth()
  const planId = auth.plan ?? 'free'
  const displayName =
    auth.user?.displayName || auth.user?.email?.split('@')[0] || 'Usuário'
  const initial = displayName.trim().charAt(0).toUpperCase()
  const photoUrl = auth.user?.photoURL ?? null

  const activePanel = sidebarPanel === 'memories' ? 'memories' : 'history'
  const inConversation = primaryView === 'conversation'
  const marketplaceActive = primaryView === 'marketplace'
  const financesActive = primaryView === 'finances'

  return (
    <aside
      className="flex h-full w-full shrink-0 flex-col overflow-hidden bg-sidebar sm:w-60 sm:rounded-xl"
      aria-label="Navegação principal"
    >
      {/* ── Header: logo / mode tabs + new chat ── */}
      <div className="flex shrink-0 items-center justify-between px-3 py-3">
        {ideAddonActive ? (
          <div className="flex gap-0.5 rounded-lg bg-raised p-0.5">
            <button
              type="button"
              onClick={() => { onOpenConversation(); onWorkbenchModeChange('chat') }}
              className={[
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                workbenchMode === 'chat'
                  ? 'bg-canvas text-fg shadow-sm'
                  : 'text-fg-muted hover:text-fg',
              ].join(' ')}
              aria-pressed={workbenchMode === 'chat'}
            >
              <IconChat />
              Chat
            </button>
            <button
              type="button"
              onClick={() => { onOpenConversation(); onWorkbenchModeChange('ide') }}
              className={[
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                workbenchMode === 'ide'
                  ? 'bg-canvas text-fg shadow-sm'
                  : 'text-fg-muted hover:text-fg',
              ].join(' ')}
              aria-pressed={workbenchMode === 'ide'}
            >
              <IconIde />
              IDE
            </button>
          </div>
        ) : (
          /* Logo — clicável para voltar ao chat */
          <button
            type="button"
            onClick={onOpenConversation}
            className="select-none px-1 text-[14px] font-bold tracking-tight text-fg transition-opacity hover:opacity-70"
            title="Voltar ao chat"
          >
            ✦ Luna
          </button>
        )}

        <button
          type="button"
          onClick={onNewConversation}
          title="Nova conversa"
          aria-label="Nova conversa"
          className="flex size-7 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-raised hover:text-fg"
        >
          <IconPlus />
        </button>
      </div>

      {/* ── Panel tabs: Histórico | Memórias — só no modo chat ── */}
      {inConversation ? (
        <div className="flex shrink-0 border-b border-line-subtle px-2">
          <button
            type="button"
            onClick={onShowHistory}
            className={[
              'flex-1 rounded-t-md px-1 py-2 text-[11px] font-medium transition-colors',
              activePanel === 'history'
                ? 'border-b-2 border-accent text-fg'
                : 'text-fg-muted hover:text-fg',
            ].join(' ')}
            aria-pressed={activePanel === 'history'}
          >
            Histórico
          </button>
          <button
            type="button"
            onClick={onShowMemories}
            className={[
              'flex-1 rounded-t-md px-1 py-2 text-[11px] font-medium transition-colors',
              activePanel === 'memories'
                ? 'border-b-2 border-accent text-fg'
                : 'text-fg-muted hover:text-fg',
            ].join(' ')}
            aria-pressed={activePanel === 'memories'}
          >
            Memórias
          </button>
        </div>
      ) : null}

      {/* ── Panel content — só no modo chat ── */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {inConversation ? (
          activePanel === 'history' ? historyPanel : memoriesPanel
        ) : (
          /* Estado vazio nas outras views */
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-[11px] text-fg-muted">
              {marketplaceActive
                ? 'Explore e instale addons para expandir o Luna.'
                : financesActive
                  ? 'Gerencie suas finanças com o agente Luna.'
                  : ''}
            </p>
          </div>
        )}
      </div>

      {/* ── Bottom nav ── */}
      <div className="shrink-0 border-t border-line-subtle px-2 py-1.5 space-y-0.5">
        <NavItem
          icon={<IconChat />}
          label="Chat"
          active={inConversation}
          onClick={onOpenConversation}
        />
        <NavItem
          icon={<IconMarketplace />}
          label="Marketplace"
          active={marketplaceActive}
          onClick={onOpenMarketplace}
        />
        {financesAddonActive ? (
          <NavItem
            icon={<IconFinances />}
            label="Finanças"
            active={financesActive}
            onClick={onOpenFinances}
          />
        ) : null}
      </div>

      {/* ── User footer ── */}
      <div className="flex shrink-0 items-center gap-2 border-t border-line-subtle px-3 py-2.5">
        <button
          type="button"
          onClick={onOpenAccount}
          aria-label="Abrir conta"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-0.5 text-left transition-colors hover:opacity-80"
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="size-7 shrink-0 rounded-full object-cover ring-1 ring-line"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-muted text-[11px] font-bold text-accent">
              {initial}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium leading-tight text-fg">
              {displayName}
            </p>
            <p className="text-[10px] leading-tight text-fg-muted">
              {PLAN_DISPLAY_LABELS[planId] ?? planId}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={onTogglePreferences}
          title="Definições"
          aria-label="Definições"
          aria-pressed={preferencesOpen}
          className={[
            'flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors',
            preferencesOpen
              ? 'bg-raised text-fg'
              : 'text-fg-muted hover:bg-raised hover:text-fg',
          ].join(' ')}
        >
          <IconSettings />
        </button>
      </div>
    </aside>
  )
}
