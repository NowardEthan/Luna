import type { ChatFolder, Conversation, Message } from '../types/chat'

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
}

function sanitizeFolder(raw: unknown): ChatFolder | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.id !== 'string' || typeof o.name !== 'string') return null
  const createdAt = typeof o.createdAt === 'number' ? o.createdAt : Date.now()
  const name = o.name.replace(/\s+/g, ' ').trim().slice(0, 80)
  if (!name.length) return null
  return { id: o.id, name, createdAt }
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
    return [{ ...raw, title, folderId, titlePinned, memory }]
  })
  if (!conversations.length) return null

  const foldersList = Array.isArray(o.folders)
    ? (o.folders as unknown[])
        .map(sanitizeFolder)
        .filter((f): f is ChatFolder => f != null)
    : []

  const folderIds = new Set(foldersList.map((f) => f.id))
  const normalizedConvos = conversations.map((c) => ({
    ...c,
    folderId: c.folderId && folderIds.has(c.folderId) ? c.folderId : null,
  }))

  const activeId = normalizedConvos.some((c) => c.id === o.activeId)
    ? o.activeId
    : normalizedConvos[0].id
  return {
    conversations: sortByUpdated(normalizedConvos),
    folders: foldersList,
    activeId,
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
