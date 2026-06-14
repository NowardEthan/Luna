import type { Conversation, ConversationSourceMode } from '../types/chat'

/** Chave de scope para conversas gerais (modo chat). */
export const CHAT_SCOPE_KEY = '__chat__'

/** Normaliza path de workspace para comparação estável (Windows/Linux). */
export function normalizeWorkspacePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
}

export function workspaceScopeKey(workspaceRoot: string): string {
  return normalizeWorkspacePath(workspaceRoot)
}

export function workspaceDisplayName(workspaceRoot: string): string {
  const norm = workspaceRoot.replace(/\\/g, '/')
  const parts = norm.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? workspaceRoot
}

export function isIdeConversation(c: Conversation): boolean {
  return c.sourceMode === 'ide'
}

export function isChatConversation(c: Conversation): boolean {
  return !isIdeConversation(c)
}

export function isIdeConversationForWorkspace(
  c: Conversation,
  workspaceRoot: string | null | undefined,
): boolean {
  if (!isIdeConversation(c) || !workspaceRoot?.trim()) return false
  const root = c.workspaceRoot?.trim()
  if (!root) return false
  return normalizeWorkspacePath(root) === normalizeWorkspacePath(workspaceRoot)
}

export function filterConversationsForScope(
  conversations: Conversation[],
  mode: ConversationSourceMode,
  workspaceRoot?: string | null,
): Conversation[] {
  if (mode === 'chat') {
    return conversations.filter(isChatConversation)
  }
  if (!workspaceRoot?.trim()) return []
  return conversations.filter((c) =>
    isIdeConversationForWorkspace(c, workspaceRoot),
  )
}

export function touchRecentWorkspace(
  recent: string[] | undefined,
  workspaceRoot: string,
  limit = 8,
): string[] {
  const key = normalizeWorkspacePath(workspaceRoot)
  const next = [
    workspaceRoot,
    ...(recent ?? []).filter(
      (p) => normalizeWorkspacePath(p) !== key,
    ),
  ]
  return next.slice(0, limit)
}
