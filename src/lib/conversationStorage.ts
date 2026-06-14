import type {
  ChatFolder,
  Conversation,
  ConversationSourceMode,
  Message,
} from '../types/chat'
import { normalizeWorkspacePath } from './workspaceSessions'
import { sanitizeCloudSyncMeta } from './cloudSyncSanitize'
import { isValidCustomIconDataUrl } from '../features/history/folderCustomIcon'
import {
  isFolderColorId,
  isFolderIconId,
  MAX_CONVERSATION_TAGS,
  normalizeTag,
} from '../features/history/folderTree'

export const STORAGE_KEY = 'chat-ia:conversations:v1'

/** Primeira vez / fallback após erro de parse */
export function defaultSeedMessages(generateId: () => string): Message[] {
  return [
    {
      id: generateId(),
      role: 'assistant',
      text:
        'Oi! Tô por aqui se quiser estudar, trabalhar num texto, ou só jogar uma ideia pra ver no que dá — sem pressa.',
    },
    {
      id: generateId(),
      role: 'user',
      text: 'Quero algo no estilo painel lateral + chat, tipo IDE.',
    },
    {
      id: generateId(),
      role: 'assistant',
      text:
        'Ah, esse clima de IDE com chat do lado — histórico numa faixa estreita e o grosso da tela pro que importa, com o campo de mensagem ali embaixo pra não perder o fio. Se quiser a gente vai afunilando: mais vibe geral ou já mão na massa em layout?',
    },
  ]
}

export function deriveTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === 'user')
  if (firstUser) {
    const t = firstUser.text.replace(/\s+/g, ' ').trim()
    const vd = firstUser.visionDescription?.replace(/\s+/g, ' ').trim()
    if (t === '(imagem anexada)' || (!t.length && vd)) {
      if (vd) return vd.length > 52 ? `${vd.slice(0, 50)}…` : vd
      return 'Mensagem com imagem'
    }
    if (!t.length) return 'Nova conversa'
    return t.length > 52 ? `${t.slice(0, 50)}…` : t
  }
  const first = messages[0]
  if (first?.role === 'assistant') {
    const s = first.text.replace(/\s+/g, ' ').trim().slice(0, 40)
    if (s.length) return s.length >= 40 ? `${s.slice(0, 37)}…` : s
  }
  return 'Nova conversa'
}

export function welcomeMessages(generateId: () => string): Message[] {
  return [
    {
      id: generateId(),
      role: 'assistant',
      text:
        'Oi, sou a Luna. Dá pra gente só conversar, desabafar ideia solta, ou ir pro mais prático — o que fizer sentido pra você agora. Nada fica na nuvem daqui, é tudo nesse computador. Por onde você quer começar?',
    },
  ]
}

function sortByUpdated(list: Conversation[]): Conversation[] {
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt)
}

export type StoredState = {
  conversations: Conversation[]
  folders: ChatFolder[]
  activeId: string
  /** Última conversa activa por scope (`__chat__` ou path normalizado do workspace). */
  activeIdByScope?: Record<string, string>
  /** Workspaces IDE abertos recentemente (paths absolutos). */
  recentWorkspaces?: string[]
}

function sanitizeFolder(
  raw: unknown,
  validParentIds: Set<string>,
): ChatFolder | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.id !== 'string' || typeof o.name !== 'string') return null
  const createdAt = typeof o.createdAt === 'number' ? o.createdAt : Date.now()
  const name = o.name.replace(/\s+/g, ' ').trim().slice(0, 80)
  if (!name.length) return null
  const parentId =
    typeof o.parentId === 'string' &&
    o.parentId.length > 0 &&
    o.parentId !== o.id &&
    validParentIds.has(o.parentId)
      ? o.parentId
      : null
  const icon = isFolderIconId(o.icon) ? o.icon : undefined
  const color = isFolderColorId(o.color) ? o.color : undefined
  const customIcon =
    typeof o.customIcon === 'string' && isValidCustomIconDataUrl(o.customIcon)
      ? o.customIcon
      : undefined
  const cloudSync = sanitizeCloudSyncMeta(o.cloudSync)
  return {
    id: o.id,
    name,
    createdAt,
    parentId,
    ...(icon ? { icon } : {}),
    ...(color ? { color } : {}),
    ...(customIcon ? { customIcon } : {}),
    ...(cloudSync ? { cloudSync } : {}),
  }
}

function sanitizeTags(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const seen = new Set<string>()
  const tags: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const t = normalizeTag(item)
    if (!t || seen.has(t)) continue
    seen.add(t)
    tags.push(t)
    if (tags.length >= MAX_CONVERSATION_TAGS) break
  }
  return tags.length ? tags : undefined
}

export function sanitizeState(parsed: unknown): StoredState | null {
  if (!parsed || typeof parsed !== 'object') return null
  const o = parsed as Record<string, unknown>
  if (!Array.isArray(o.conversations) || typeof o.activeId !== 'string') return null
  const conversations = (o.conversations as unknown[]).flatMap((c): Conversation[] => {
    if (
      !c ||
      typeof c !== 'object' ||
      typeof (c as Conversation).id !== 'string' ||
      typeof (c as Conversation).updatedAt !== 'number' ||
      !Array.isArray((c as Conversation).messages)
    ) {
      return []
    }
    const raw = c as Conversation & {
      folderId?: string | null
      titlePinned?: boolean
      tags?: unknown
    }
    const title =
      typeof raw.title === 'string' && raw.title.length > 0
        ? raw.title
        : deriveTitle(raw.messages)
    const folderId =
      typeof raw.folderId === 'string' && raw.folderId.length > 0
        ? raw.folderId
        : null
    const titlePinned = raw.titlePinned === true
    const tags = sanitizeTags(raw.tags)
    let memory = raw.memory
    if (memory && typeof memory === 'object') {
      const mo = memory as Record<string, unknown>
      const rollingSummary =
        typeof mo.rollingSummary === 'string' ? mo.rollingSummary.slice(0, 200_000) : ''
      const summarizedThroughMessageId =
        typeof mo.summarizedThroughMessageId === 'string' &&
        mo.summarizedThroughMessageId.length > 0
          ? mo.summarizedThroughMessageId
          : undefined
      const updatedAtMem =
        typeof mo.updatedAt === 'number' && !Number.isNaN(mo.updatedAt)
          ? mo.updatedAt
          : undefined
      memory =
        rollingSummary.length > 0 || summarizedThroughMessageId
          ? {
              rollingSummary,
              ...(summarizedThroughMessageId
                ? { summarizedThroughMessageId }
                : {}),
              ...(updatedAtMem != null ? { updatedAt: updatedAtMem } : {}),
            }
          : undefined
    } else {
      memory = undefined
    }
    const cloudSync = sanitizeCloudSyncMeta(
      (raw as Record<string, unknown>).cloudSync,
    )
    const lunaSessaoId =
      typeof raw.lunaSessaoId === 'string' && raw.lunaSessaoId.length > 0
        ? raw.lunaSessaoId
        : raw.id

    const sourceMode: ConversationSourceMode | undefined =
      raw.sourceMode === 'ide' ? 'ide' : raw.sourceMode === 'chat' ? 'chat' : undefined
    const workspaceRoot =
      typeof raw.workspaceRoot === 'string' && raw.workspaceRoot.trim().length > 0
        ? raw.workspaceRoot.trim()
        : sourceMode === 'ide'
          ? null
          : undefined

    return [
      {
        ...raw,
        title,
        folderId,
        titlePinned,
        lunaSessaoId,
        memory,
        ...(sourceMode ? { sourceMode } : {}),
        ...(workspaceRoot !== undefined ? { workspaceRoot } : {}),
        ...(tags ? { tags } : {}),
        ...(cloudSync ? { cloudSync } : {}),
      },
    ]
  })
  if (!conversations.length) return null

  const rawFolders = Array.isArray(o.folders) ? (o.folders as unknown[]) : []
  const folderIds = new Set(
    rawFolders
      .map((f) =>
        f && typeof f === 'object' && typeof (f as ChatFolder).id === 'string'
          ? (f as ChatFolder).id
          : null,
      )
      .filter((id): id is string => id != null),
  )

  const foldersList = rawFolders
    .map((f) => sanitizeFolder(f, folderIds))
    .filter((f): f is ChatFolder => f != null)

  // Segunda passagem: parentId só válido se o pai existir na lista sanitizada
  const validIds = new Set(foldersList.map((f) => f.id))
  const foldersNormalized = foldersList.map((f) => ({
    ...f,
    parentId:
      f.parentId && validIds.has(f.parentId) && f.parentId !== f.id
        ? f.parentId
        : null,
  }))
  const normalizedConvos = conversations.map((c) => ({
    ...c,
    folderId: c.folderId && validIds.has(c.folderId) ? c.folderId : null,
  }))

  const activeId = normalizedConvos.some((c) => c.id === o.activeId)
    ? o.activeId
    : normalizedConvos[0].id

  const activeIdByScope: Record<string, string> = {}
  if (o.activeIdByScope && typeof o.activeIdByScope === 'object') {
    for (const [key, val] of Object.entries(
      o.activeIdByScope as Record<string, unknown>,
    )) {
      if (typeof val !== 'string' || !val.trim()) continue
      if (!normalizedConvos.some((c) => c.id === val)) continue
      activeIdByScope[key] = val
    }
  }

  const recentWorkspaces = Array.isArray(o.recentWorkspaces)
    ? (o.recentWorkspaces as unknown[])
        .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
        .map((p) => p.trim())
        .filter(
          (p, i, arr) =>
            arr.findIndex(
              (x) => normalizeWorkspacePath(x) === normalizeWorkspacePath(p),
            ) === i,
        )
        .slice(0, 12)
    : undefined

  return {
    conversations: sortByUpdated(normalizedConvos),
    folders: foldersNormalized,
    activeId,
    ...(Object.keys(activeIdByScope).length
      ? { activeIdByScope }
      : {}),
    ...(recentWorkspaces?.length ? { recentWorkspaces } : {}),
  }
}

export function initialStore(generateId: () => string): StoredState {
  const id = generateId()
  const messages = defaultSeedMessages(generateId)
  return {
    activeId: id,
    folders: [],
    conversations: sortByUpdated([
      {
        id,
        title: deriveTitle(messages),
        folderId: null,
        messages,
        updatedAt: Date.now(),
      },
    ]),
  }
}
