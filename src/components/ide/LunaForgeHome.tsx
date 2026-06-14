import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Conversation } from '../../types/chat'
import {
  filterConversationsForScope,
  workspaceDisplayName,
} from '../../lib/workspaceSessions'
import { LUNA_FORGE_NAME, LUNA_FORGE_TAGLINE } from '../../lib/lunaForgeBrand'

type Props = {
  recentWorkspaces: string[]
  conversations: Conversation[]
  onOpenFolder: () => void
  onOpenRecent: (path: string) => void
  onSwitchToChat?: () => void
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  if (mins < 2) return 'agora'
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} d`
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
  }).format(ts)
}

export function LunaForgeHome({
  recentWorkspaces,
  conversations,
  onOpenFolder,
  onOpenRecent,
  onSwitchToChat,
}: Props) {
  const { t } = useTranslation()

  const recentCards = useMemo(() => {
    return recentWorkspaces.map((path) => {
      const chats = filterConversationsForScope(conversations, 'ide', path)
      const lastUpdated = chats.reduce(
        (max, c) => Math.max(max, c.updatedAt),
        0,
      )
      return {
        path,
        name: workspaceDisplayName(path),
        chatCount: chats.length,
        lastUpdated,
      }
    })
  }, [recentWorkspaces, conversations])

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-y-auto bg-canvas">
      {onSwitchToChat ? (
        <div className="relative z-10 flex shrink-0 items-center border-b border-line-subtle px-4 py-2">
          <button
            type="button"
            onClick={onSwitchToChat}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:bg-raised hover:text-fg"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M12 3a7 7 0 0 0-7 7v4l-3 3h8a7 7 0 1 0 7-7Z" />
            </svg>
            Voltar ao Chat
          </button>
        </div>
      ) : null}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(139,92,246,0.22), transparent 60%), radial-gradient(ellipse 60% 40% at 90% 80%, rgba(56,189,248,0.08), transparent 50%)',
        }}
      />

      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-8 py-12">
        <div className="mb-10 flex items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/30 to-violet-500/20 shadow-lg shadow-accent/10 ring-1 ring-accent/25"
            aria-hidden
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              className="stroke-accent"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 3h8l4 4v14H4V7l4-4z" />
              <path d="M12 3v4h4" />
              <path d="M9 14l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">
              {LUNA_FORGE_NAME}
            </h1>
            <p className="mt-0.5 text-sm text-fg-muted">{LUNA_FORGE_TAGLINE}</p>
          </div>
        </div>

        <p className="mb-8 max-w-lg text-[15px] leading-relaxed text-fg-dim">
          {t('lunaForge.welcome')}
        </p>

        <div className="mb-10 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void onOpenFolder()}
            className="luna-btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-medium shadow-md shadow-accent/15"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className="stroke-current"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
            </svg>
            {t('lunaForge.openFolder')}
          </button>
        </div>

        {recentCards.length > 0 ? (
          <section>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
              {t('lunaForge.recent')}
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {recentCards.map((card) => (
                <li key={card.path}>
                  <button
                    type="button"
                    onClick={() => void onOpenRecent(card.path)}
                    className="luna-hover-row group flex w-full flex-col rounded-xl border border-line-subtle/80 bg-surface/60 px-4 py-3 text-left transition-colors hover:border-accent/30 hover:bg-surface"
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-sm font-bold text-accent transition-colors group-hover:bg-accent/20">
                        {card.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-fg">
                          {card.name}
                        </span>
                        <span
                          className="block truncate text-[10px] text-fg-muted"
                          title={card.path}
                        >
                          {card.path}
                        </span>
                      </span>
                    </span>
                    <span className="mt-2 flex gap-3 text-[10px] text-fg-muted">
                      <span>
                        {t('lunaForge.chatCount', { count: card.chatCount })}
                      </span>
                      {card.lastUpdated > 0 ? (
                        <span>{formatRelativeTime(card.lastUpdated)}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="text-[12px] text-fg-muted">{t('lunaForge.noRecent')}</p>
        )}

        <ul className="mt-12 grid gap-2 border-t border-line-subtle/60 pt-8 sm:grid-cols-3">
          {(
            [
              'lunaForge.feature_editor',
              'lunaForge.feature_agent',
              'lunaForge.feature_memory',
            ] as const
          ).map((key) => (
            <li
              key={key}
              className="rounded-lg bg-raised/40 px-3 py-2.5 text-[11px] leading-snug text-fg-muted"
            >
              {t(key)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
