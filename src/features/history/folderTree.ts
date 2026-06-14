import type { ChatFolder, FolderColorId, FolderIconId } from '../../types/chat'
import { FOLDER_ICON_OPTIONS } from './folderVisuals'

export const MAX_FOLDER_DEPTH = 6

export type FolderTreeNode = ChatFolder & { children: FolderTreeNode[] }

const FOLDER_ICONS = new Set<FolderIconId>(FOLDER_ICON_OPTIONS)

const FOLDER_COLORS = new Set<FolderColorId>([
  'default',
  'blue',
  'green',
  'amber',
  'rose',
  'violet',
  'cyan',
])

export function isFolderIconId(v: unknown): v is FolderIconId {
  return typeof v === 'string' && FOLDER_ICONS.has(v as FolderIconId)
}

export function isFolderColorId(v: unknown): v is FolderColorId {
  return typeof v === 'string' && FOLDER_COLORS.has(v as FolderColorId)
}

function sortSiblings(list: ChatFolder[]): ChatFolder[] {
  return [...list].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
  )
}

export function buildFolderTree(folders: ChatFolder[]): FolderTreeNode[] {
  const ids = new Set(folders.map((f) => f.id))
  const byParent = new Map<string | null, ChatFolder[]>()

  for (const f of folders) {
    const rawParent = f.parentId ?? null
    const parentId =
      rawParent && ids.has(rawParent) && rawParent !== f.id ? rawParent : null
    if (!byParent.has(parentId)) byParent.set(parentId, [])
    byParent.get(parentId)!.push({ ...f, parentId })
  }

  function build(parentId: string | null): FolderTreeNode[] {
    return sortSiblings(byParent.get(parentId) ?? []).map((f) => ({
      ...f,
      children: build(f.id),
    }))
  }

  return build(null)
}

export function getDescendantIds(
  folderId: string,
  folders: ChatFolder[],
): Set<string> {
  const childrenByParent = new Map<string, ChatFolder[]>()
  for (const f of folders) {
    if (!f.parentId) continue
    if (!childrenByParent.has(f.parentId)) {
      childrenByParent.set(f.parentId, [])
    }
    childrenByParent.get(f.parentId)!.push(f)
  }

  const result = new Set<string>()
  const stack = [...(childrenByParent.get(folderId) ?? [])]
  while (stack.length) {
    const node = stack.pop()!
    if (result.has(node.id)) continue
    result.add(node.id)
    stack.push(...(childrenByParent.get(node.id) ?? []))
  }
  return result
}

export function folderDepth(
  folderId: string | null,
  folders: ChatFolder[],
): number {
  let depth = 0
  let current = folderId
  const seen = new Set<string>()
  while (current) {
    if (seen.has(current)) break
    seen.add(current)
    depth++
    const f = folders.find((x) => x.id === current)
    current = f?.parentId ?? null
    if (depth > 32) break
  }
  return depth
}

export function canNestUnder(
  parentId: string | null,
  folders: ChatFolder[],
): boolean {
  if (!parentId) return true
  return folderDepth(parentId, folders) < MAX_FOLDER_DEPTH
}

export function wouldCreateCycle(
  folderId: string,
  newParentId: string | null,
  folders: ChatFolder[],
): boolean {
  if (!newParentId) return false
  if (folderId === newParentId) return true
  return getDescendantIds(folderId, folders).has(newParentId)
}

export function getFolderPathLabel(
  folderId: string,
  folders: ChatFolder[],
): string {
  const parts: string[] = []
  let current: string | null = folderId
  const seen = new Set<string>()
  while (current) {
    if (seen.has(current)) break
    seen.add(current)
    const f = folders.find((x) => x.id === current)
    if (!f) break
    parts.unshift(f.name)
    current = f.parentId ?? null
  }
  return parts.join(' / ')
}

export type FolderSelectOption = {
  value: string
  label: string
  depth: number
}

export function flattenFoldersForSelect(
  tree: FolderTreeNode[],
  depth = 0,
): FolderSelectOption[] {
  const out: FolderSelectOption[] = []
  for (const node of tree) {
    const prefix = depth > 0 ? `${'  '.repeat(depth)}↳ ` : ''
    out.push({ value: node.id, label: `${prefix}${node.name}`, depth })
    out.push(...flattenFoldersForSelect(node.children, depth + 1))
  }
  return out
}

/** Conversas nesta pasta e em todas as subpastas */
export function getConversationIdsInFolderSubtree(
  folderId: string,
  folders: ChatFolder[],
  conversations: { id: string; folderId: string | null }[],
): string[] {
  const folderIds = new Set([folderId, ...getDescendantIds(folderId, folders)])
  return conversations
    .filter((c) => c.folderId != null && folderIds.has(c.folderId))
    .map((c) => c.id)
}

export function countConversationsInSubtree(
  node: FolderTreeNode,
  conversations: { folderId: string | null }[],
): number {
  let total = conversations.filter((c) => c.folderId === node.id).length
  for (const child of node.children) {
    total += countConversationsInSubtree(child, conversations)
  }
  return total
}

/** Ids da pasta e de todos os ancestrais (para expandir o caminho) */
export function getFolderAncestorIds(
  folderId: string,
  folders: ChatFolder[],
): string[] {
  const ids: string[] = []
  let current: string | null = folderId
  const seen = new Set<string>()
  while (current) {
    if (seen.has(current)) break
    seen.add(current)
    ids.push(current)
    const f = folders.find((x) => x.id === current)
    current = f?.parentId ?? null
  }
  return ids
}

export function collectAllTags(conversations: { tags?: string[] }[]): string[] {
  const set = new Set<string>()
  for (const c of conversations) {
    for (const t of c.tags ?? []) {
      if (t) set.add(t)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
}

export const MAX_CONVERSATION_TAGS = 8
export const MAX_TAG_LENGTH = 24

export function normalizeTag(raw: string): string | null {
  const t = raw.replace(/\s+/g, ' ').trim().toLowerCase().slice(0, MAX_TAG_LENGTH)
  return t.length ? t : null
}
