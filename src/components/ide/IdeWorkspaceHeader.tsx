import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Conversation } from '../../types/chat'
import {
  filterConversationsForScope,
  workspaceDisplayName,
} from '../../lib/workspaceSessions'

type Props = {
  workspaceRoot: string | null
  conversations: Conversation[]
}

/** Cabeçalho do painel IDE — projecto activo e contagem de chats do workspace. */
export function IdeWorkspaceHeader({ workspaceRoot, conversations }: Props) {
  const { t } = useTranslation()

  const projectChats = useMemo(() => {
    if (!workspaceRoot) return []
    return filterConversationsForScope(conversations, 'ide', workspaceRoot)
  }, [conversations, workspaceRoot])

  if (!workspaceRoot?.trim()) {
    return (
      <div className="border-b border-line-subtle/80 bg-canvas/40 px-3 py-2.5">
        <p className="text-[11px] font-medium text-fg-dim">
          {t('ide.workspace.noProject')}
        </p>
        <p className="mt-0.5 text-[10px] text-fg-muted">
          {t('ide.workspace.noProjectHint')}
        </p>
      </div>
    )
  }

  const name = workspaceDisplayName(workspaceRoot)

  return (
    <div className="border-b border-line-subtle/80 bg-canvas/40 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/15 text-[11px] font-bold text-accent"
          aria-hidden
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-fg">{name}</p>
          <p
            className="truncate text-[10px] text-fg-muted"
            title={workspaceRoot}
          >
            {workspaceRoot}
          </p>
        </div>
      </div>
      <p className="mt-1.5 text-[10px] text-fg-muted">
        {t('ide.workspace.chatCount', {
          count: projectChats.length,
          defaultValue:
            projectChats.length === 1
              ? '{{count}} chat neste projecto'
              : '{{count}} chats neste projecto',
        })}
      </p>
    </div>
  )
}
