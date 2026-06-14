import { useEffect, useRef } from 'react'
import type { Conversation } from '../../types/chat'
import type { LunaWorkbenchMode } from '../../lib/workbenchMode'
import {
  CHAT_SCOPE_KEY,
  filterConversationsForScope,
  isChatConversation,
  isIdeConversationForWorkspace,
  workspaceScopeKey,
} from '../../lib/workspaceSessions'

type CreateFn = (opts?: {
  folderId?: string | null
  variant?: 'chat' | 'ide' | 'finances'
  sourceMode?: 'chat' | 'ide'
  workspaceRoot?: string | null
  welcomeContext?: unknown
}) => string

type Deps = {
  hydrated: boolean
  workbenchMode: LunaWorkbenchMode
  workspaceRoot: string | null
  conversations: Conversation[]
  activeId: string
  activeIdByScope: Record<string, string>
  setActiveId: (id: string) => void
  rememberActiveForScope: (scopeKey: string, id: string) => void
  pushRecentWorkspace: (root: string) => void
  createConversation: CreateFn
  buildWelcomeContext: (variant: 'chat' | 'ide') => unknown
}

/** A conversa activa pertence ao scope (chat ou workspace IDE actual)? */
function activeBelongsToScope(
  active: Conversation | undefined,
  mode: LunaWorkbenchMode,
  workspaceRoot: string | null,
): boolean {
  if (!active) return false
  if (mode === 'chat') return isChatConversation(active)
  if (!workspaceRoot?.trim()) return false
  return isIdeConversationForWorkspace(active, workspaceRoot)
}

function pickConversationForScope(
  conversations: Conversation[],
  mode: 'chat' | 'ide',
  workspaceRoot: string | null,
  rememberedId?: string,
): Conversation | undefined {
  if (rememberedId) {
    const hit = conversations.find((c) => c.id === rememberedId)
    if (hit) {
      if (mode === 'chat' && isChatConversation(hit)) return hit
      if (
        mode === 'ide' &&
        workspaceRoot &&
        isIdeConversationForWorkspace(hit, workspaceRoot)
      ) {
        return hit
      }
    }
  }
  const scoped = filterConversationsForScope(
    conversations,
    mode,
    workspaceRoot ?? undefined,
  )
  return scoped[0]
}

/**
 * Mantém a conversa activa sempre dentro do scope actual (chat vs workspace IDE).
 *
 * Em vez de reagir só a transições, valida continuamente o invariante:
 * «o `activeId` global pertence ao scope actual». Isto evita o vazamento de
 * conversas entre o chat normal e o Luna Forge (hidratação, fallback de
 * activeId, cloud sync, abertura de workspace, etc.).
 */
export function useWorkspaceConversationSync(deps: Deps) {
  const {
    hydrated,
    workbenchMode,
    workspaceRoot,
    conversations,
    activeId,
    activeIdByScope,
    setActiveId,
    rememberActiveForScope,
    pushRecentWorkspace,
    createConversation,
    buildWelcomeContext,
  } = deps

  const conversationsRef = useRef(conversations)
  conversationsRef.current = conversations
  const activeIdByScopeRef = useRef(activeIdByScope)
  activeIdByScopeRef.current = activeIdByScope

  // Evita criar/seleccionar em duplicado enquanto o estado propaga.
  const busyRef = useRef(false)

  // Regista o workspace nos recentes ao abrir/trocar.
  const prevWorkspaceRef = useRef<string | null>(null)
  useEffect(() => {
    if (!hydrated || workbenchMode !== 'ide') return
    if (workspaceRoot === prevWorkspaceRef.current) return
    prevWorkspaceRef.current = workspaceRoot
    if (workspaceRoot?.trim()) pushRecentWorkspace(workspaceRoot)
  }, [hydrated, workbenchMode, workspaceRoot, pushRecentWorkspace])

  // Invariante de scope — corre sempre que o estado relevante muda.
  useEffect(() => {
    if (!hydrated) return
    if (busyRef.current) return

    const convs = conversationsRef.current
    const active = convs.find((c) => c.id === activeId)

    // Já está coerente — só memoriza para restaurar mais tarde.
    if (activeBelongsToScope(active, workbenchMode, workspaceRoot)) {
      const key =
        workbenchMode === 'ide' && workspaceRoot?.trim()
          ? workspaceScopeKey(workspaceRoot)
          : CHAT_SCOPE_KEY
      rememberActiveForScope(key, activeId)
      return
    }

    if (workbenchMode === 'ide') {
      // IDE sem workspace (Luna Forge Home): não há sessão de workspace
      // possível; o workbench mostra a home, não o chat. Não forçamos nada.
      if (!workspaceRoot?.trim()) return

      const scopeKey = workspaceScopeKey(workspaceRoot)
      const remembered = activeIdByScopeRef.current[scopeKey]
      const hit = pickConversationForScope(
        convs,
        'ide',
        workspaceRoot,
        remembered,
      )
      if (hit) {
        setActiveId(hit.id)
        rememberActiveForScope(scopeKey, hit.id)
        return
      }
      busyRef.current = true
      const id = createConversation({
        variant: 'ide',
        sourceMode: 'ide',
        workspaceRoot,
        welcomeContext: buildWelcomeContext('ide'),
      })
      rememberActiveForScope(scopeKey, id)
      queueMicrotask(() => {
        busyRef.current = false
      })
      return
    }

    // Modo chat — selecciona/garante uma conversa de chat.
    const remembered = activeIdByScopeRef.current[CHAT_SCOPE_KEY]
    const hit = pickConversationForScope(convs, 'chat', null, remembered)
    if (hit) {
      setActiveId(hit.id)
      rememberActiveForScope(CHAT_SCOPE_KEY, hit.id)
      return
    }
    busyRef.current = true
    const id = createConversation({
      variant: 'chat',
      sourceMode: 'chat',
      welcomeContext: buildWelcomeContext('chat'),
    })
    rememberActiveForScope(CHAT_SCOPE_KEY, id)
    queueMicrotask(() => {
      busyRef.current = false
    })
  }, [
    hydrated,
    workbenchMode,
    workspaceRoot,
    activeId,
    conversations,
    setActiveId,
    rememberActiveForScope,
    createConversation,
    buildWelcomeContext,
  ])
}
