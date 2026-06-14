import type { ChatFolder, Conversation, FolderIconId, Message } from '../../types/chat'
import type { MemoryNote, UserMemoryState } from '../../types/memory'
import { isChatConversation, isIdeConversation } from '../../lib/workspaceSessions'
import {
  getStarterIdeasChat,
  getStarterIdeasIde,
} from './components/chatStarters'
import {
  buildFinancesChatStarterItems,
  buildFinancesWelcomeAssistantParts,
  financesWelcomePanelHint,
} from '../finances/financesChatWelcome'

export type ContextualWelcomeVariant = 'chat' | 'ide' | 'finances'

export type ContextualWelcomeInput = {
  conversationId?: string
  folderId?: string | null
  conversations: Conversation[]
  folders: ChatFolder[]
  userMemory: UserMemoryState
  cloudSyncAvailable: boolean
  variant: ContextualWelcomeVariant
}

export type WelcomeConversationBadge = {
  id: string
  title: string
  label: string
}

export type WelcomeFolderRef = Pick<
  ChatFolder,
  'id' | 'name' | 'icon' | 'color' | 'customIcon'
>

export type WelcomeFinanceBadgeKind =
  | 'tab'
  | 'money'
  | 'month'
  | 'account'
  | 'goal'
  | 'count'

export type WelcomeTextPart =
  | { type: 'text'; value: string }
  | { type: 'folder'; folder: WelcomeFolderRef }
  | { type: 'finance'; kind: WelcomeFinanceBadgeKind; label: string }

export type WelcomeStarterItem = {
  id: string
  parts: WelcomeTextPart[]
  message: string
}

export type ContextualWelcomeBundle = {
  assistantParts: WelcomeTextPart[]
  assistantText: string
  panelHint: string
  starters: string[]
  starterItems?: WelcomeStarterItem[]
  conversationBadges: WelcomeConversationBadge[]
}

const fallbackChat = () => getStarterIdeasChat()
const fallbackIde = () => getStarterIdeasIde()
/** Frases em 1.ª pessoa — o utilizador clica e isso vai para o composer. */
const FOLDER_STARTERS: Partial<Record<FolderIconId, string[]>> = {
  code: ['Me ajuda a entender um erro no código.', 'Quero refatorar um trecho com calma.'],
  book: ['Preciso resumir um texto que vou colar.', 'Me ajuda a montar um plano de estudo.'],
  graduation: ['Explica isso de um jeito simples.', 'O que devo revisar antes de uma prova?'],
  briefcase: ['Organiza minha semana de trabalho.', 'Rascunha um e-mail curto pra mim.'],
  rocket: ['Quais os próximos passos desse projeto?', 'O que pode dar errado aqui?'],
  lightbulb: ['Quero jogar ideias sem filtro.', 'Tenho uma ideia meio vaga — me ajuda?'],
  heart: ['Preciso desabafar um pouco.', 'Me ajuda a colocar isso em palavras.'],
  wrench: ['Algo não está funcionando — por onde começo?', 'Faz um checklist antes de eu publicar.'],
  palette: ['Quero um feedback sincero nesse layout.', 'Me dá três tons diferentes pro mesmo texto.'],
}

const TOPIC_STARTERS: Record<string, string[]> = {
  autismo: [
    'Quero falar sobre rotina e sobrecarga no dia a dia.',
    'Como lido melhor quando tudo parece barulho demais?',
  ],
  trabalho: [
    'Preciso organizar o trabalho desta semana.',
    'Me ajuda a priorizar o que é urgente de verdade.',
  ],
  estudo: [
    'Tenho dificuldade de focar nos estudos.',
    'Monta um plano de revisão comigo.',
  ],
  projeto: [
    'Quero destravar este projeto.',
    'Por onde começo sem me perder?',
  ],
}

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

/**
 * Conversas do mesmo «universo» do welcome actual — evita que o Forge sugira
 * conversas do chat normal (e vice-versa).
 */
function sameScope(
  c: Conversation,
  variant: ContextualWelcomeVariant,
): boolean {
  if (variant === 'ide') return isIdeConversation(c)
  if (variant === 'chat') return isChatConversation(c)
  return true
}

function otherConversations(
  conversations: Conversation[],
  excludeId?: string,
  variant: ContextualWelcomeVariant = 'chat',
): Conversation[] {
  return conversations.filter(
    (c) => c.id !== excludeId && sameScope(c, variant),
  )
}

function hasUserMessages(c: Conversation): boolean {
  return c.messages.some((m) => m.role === 'user')
}

/** Texto escrito pela Luna sobre o utilizador — não serve como sugestão clicável. */
function isObservationAboutUser(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  return (
    /^(o|a)\s+(usu[aá]rio|utilizador|user)\b/i.test(t) ||
    /\b(informou|disse|mencionou|relatou|é|são|está)\s+(que\s+)?(autis|ele|ela|usu)/i.test(t) ||
    /^(lembr|nota|memór|registro|guardado)\b/i.test(t) ||
    /\b(perfil|contexto)\s+do\s+usu/i.test(t)
  )
}

function looksLikeUserVoice(text: string): boolean {
  const t = text.trim()
  if (t.length < 8 || t.length > 120) return false
  if (isObservationAboutUser(t)) return false
  return /^(eu |me |quero |preciso |como |o que |por que|ajuda|monta|organiza|explica|faz |tenho )/i.test(
    t,
  )
}

function recentNotes(notes: MemoryNote[] | undefined, limit = 2): MemoryNote[] {
  if (!notes?.length) return []
  return [...notes].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit)
}

function pickUnique(candidates: string[], limit: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of candidates) {
    const key = c.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
    if (out.length >= limit) break
  }
  return out
}

function topicKeywords(title: string): string[] {
  return title
    .toLowerCase()
    .split(/[\s,/·\-—]+/)
    .filter((w) => w.length >= 4)
}

function starterFromNote(note: MemoryNote): string | null {
  const detail = note.detail?.replace(/\s+/g, ' ').trim()
  if (detail && looksLikeUserVoice(detail)) {
    return detail.endsWith('?') ? detail : `${detail.replace(/\.$/, '')}?`
  }

  const title = note.title.replace(/\s+/g, ' ').trim()
  if (!title || isObservationAboutUser(title)) return null

  for (const [key, lines] of Object.entries(TOPIC_STARTERS)) {
    if (title.toLowerCase().includes(key)) {
      return lines[title.length % lines.length]
    }
  }

  const words = topicKeywords(title)
  const main = words[0] ?? title.toLowerCase()
  const templates = [
    `Quero conversar sobre ${main}.`,
    `Me ajuda com uma coisa sobre ${main}.`,
    `Tenho uma dúvida sobre ${main}.`,
  ]
  return templates[title.length % templates.length]
}

function buildConversationBadges(
  input: ContextualWelcomeInput,
): WelcomeConversationBadge[] {
  const others = otherConversations(
    input.conversations,
    input.conversationId,
    input.variant,
  ).filter(hasUserMessages)
  const badges: WelcomeConversationBadge[] = []
  const used = new Set<string>()

  const push = (c: Conversation, labelPrefix: string) => {
    if (used.has(c.id)) return
    used.add(c.id)
    badges.push({
      id: c.id,
      title: c.title,
      label: `${labelPrefix}: ${truncate(c.title, 26)}`,
    })
  }

  const pinned = others.find((c) => c.pinned)
  if (pinned) push(pinned, 'Fixada')

  const recent = [...others].sort((a, b) => b.updatedAt - a.updatedAt)[0]
  if (recent) push(recent, 'Recente')

  const folderId = input.folderId ?? null
  const inFolder = others
    .filter((c) => c.folderId === folderId)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]
  if (inFolder && !used.has(inFolder.id)) {
    push(inFolder, 'Nesta pasta')
  }

  return badges.slice(0, 2)
}

function buildStarters(input: ContextualWelcomeInput): string[] {
  if (input.variant === 'finances') {
    return buildFinancesChatStarterItems().map((s) => s.message)
  }
  if (input.variant === 'ide') return [...fallbackIde()]

  const candidates: string[] = []
  const folderId = input.folderId ?? null
  const folder = folderId
    ? input.folders.find((f) => f.id === folderId)
    : undefined

  for (const note of recentNotes(input.userMemory.memoryNotes, 2)) {
    const p = starterFromNote(note)
    if (p) candidates.push(p)
  }

  if (folder?.icon && FOLDER_STARTERS[folder.icon]) {
    candidates.push(...FOLDER_STARTERS[folder.icon]!)
  } else if (folder) {
    candidates.push(`Quero organizar algo na pasta «${folder.name}».`)
  }

  const inFolder = otherConversations(
    input.conversations,
    input.conversationId,
    input.variant,
  ).filter((c) => c.folderId === folderId)
  const tags = new Set<string>()
  for (const c of inFolder.slice(0, 6)) {
    for (const t of c.tags ?? []) tags.add(t)
  }
  for (const tag of [...tags].slice(0, 1)) {
    candidates.push(`Quero falar sobre ${tag}.`)
  }

  candidates.push(...fallbackChat())

  return pickUnique(candidates, 3)
}

function buildPanelHint(input: ContextualWelcomeInput): string {
  if (input.variant === 'finances') return financesWelcomePanelHint()
  if (input.variant === 'ide') {
    return 'Toque numa sugestão ou descreva o que precisa no projeto.'
  }
  return 'Toque numa sugestão — ela vira sua mensagem — ou escreva do seu jeito.'
}

function toFolderRef(folder: ChatFolder): WelcomeFolderRef {
  return {
    id: folder.id,
    name: folder.name,
    icon: folder.icon,
    color: folder.color,
    customIcon: folder.customIcon,
  }
}

export function welcomePartToPlain(part: WelcomeTextPart): string {
  if (part.type === 'text') return part.value
  if (part.type === 'folder') return part.folder.name
  return part.label
}

export function partsToPlainText(parts: WelcomeTextPart[]): string {
  return parts
    .map(welcomePartToPlain)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildAssistantParts(
  input: ContextualWelcomeInput,
  badges: WelcomeConversationBadge[],
): WelcomeTextPart[] {
  if (input.variant === 'finances') {
    return buildFinancesWelcomeAssistantParts()
  }
  if (input.variant === 'ide') {
    return [
      {
        type: 'text',
        value: 'Diz o ficheiro ou o que quer fazer — sigo com você passo a passo.',
      },
    ]
  }

  const others = otherConversations(
    input.conversations,
    input.conversationId,
    input.variant,
  )
  const isFirst = others.length === 0
  const folderId = input.folderId ?? null
  const folder = folderId
    ? input.folders.find((f) => f.id === folderId)
    : undefined

  const hour = new Date().getHours()
  const greet =
    hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  if (isFirst) {
    if (folder) {
      return [
        { type: 'text', value: 'Oi! Sou a Luna. Esta conversa fica em ' },
        { type: 'folder', folder: toFolderRef(folder) },
        { type: 'text', value: ' — diga o que precisa.' },
      ]
    }
    return [
      {
        type: 'text',
        value:
          'Oi! Sou a Luna. Pode conversar, pedir ajuda prática ou só organizar ideias.',
      },
    ]
  }

  const parts: WelcomeTextPart[] = [
    { type: 'text', value: `${greet}! Que bom ver você.` },
  ]

  if (folder) {
    parts.push(
      { type: 'text', value: ' Deixei esta conversa em ' },
      { type: 'folder', folder: toFolderRef(folder) },
      { type: 'text', value: '.' },
    )
  }

  if (badges.length > 0) {
    parts.push({
      type: 'text',
      value: ' Se quiser, retoma um chat antigo nos botões abaixo.',
    })
  }

  return parts
}

export function buildContextualWelcome(
  input: ContextualWelcomeInput,
): ContextualWelcomeBundle {
  const conversationBadges = buildConversationBadges(input)
  const assistantParts = buildAssistantParts(input, conversationBadges)
  const starterItems =
    input.variant === 'finances' ? buildFinancesChatStarterItems() : undefined
  return {
    assistantParts,
    assistantText: partsToPlainText(assistantParts),
    panelHint: buildPanelHint(input),
    starters: starterItems
      ? starterItems.map((s) => s.message)
      : buildStarters(input),
    starterItems,
    conversationBadges,
  }
}

export function contextualWelcomeMessages(
  generateId: () => string,
  input: ContextualWelcomeInput,
): Message[] {
  const { assistantText } = buildContextualWelcome(input)
  return [
    {
      id: generateId(),
      role: 'assistant',
      text: assistantText,
    },
  ]
}

export function buildWelcomePanel(
  input: Omit<ContextualWelcomeInput, 'conversationId'> & {
    conversation: Conversation | null
  },
): ContextualWelcomeBundle {
  return buildContextualWelcome({
    ...input,
    conversationId: input.conversation?.id,
    folderId: input.conversation?.folderId ?? input.folderId ?? null,
  })
}
