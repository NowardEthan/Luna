import { toolBadgeClass, type BadgeToneId } from './badgeTone'

/** Tipos de memória — escolhidos pela Luna em `save_memory` ou inferidos do título. */
export const MEMORY_KIND_IDS = [
  'identity',
  'preference',
  'project',
  'constraint',
  'health',
  'context',
  'other',
] as const

export type MemoryKindId = (typeof MEMORY_KIND_IDS)[number]

export type MemoryKindMeta = {
  id: MemoryKindId
  label: string
  description: string
  badgeTone: BadgeToneId
  badgeClass: string
  sectionClass: string
}

const KIND_BADGE_TONE: Record<MemoryKindId, BadgeToneId> = {
  identity: 'sky',
  preference: 'amber',
  project: 'violet',
  constraint: 'rose',
  health: 'teal',
  context: 'slate',
  other: 'slate',
}

/** Classes do badge por tipo — adaptadas ao tema claro/escuro. */
export function memoryKindBadgeClass(kind: MemoryKindId): string {
  return toolBadgeClass(KIND_BADGE_TONE[kind] ?? 'slate')
}

export const MEMORY_KIND_META: Record<MemoryKindId, MemoryKindMeta> = {
  identity: {
    id: 'identity',
    label: 'Identidade',
    description: 'Nome, tratamento, papel, quem é a pessoa',
    badgeTone: 'sky',
    badgeClass: 'bg-sky-500/15 text-sky-200 ring-sky-400/25',
    sectionClass: 'border-sky-500/20',
  },
  preference: {
    id: 'preference',
    label: 'Preferências',
    description: 'Tom, idioma, gostos e hábitos estáveis',
    badgeTone: 'amber',
    badgeClass: 'bg-amber-500/15 text-amber-200 ring-amber-400/25',
    sectionClass: 'border-amber-500/20',
  },
  project: {
    id: 'project',
    label: 'Projectos',
    description: 'Apps, stacks, objectivos e trabalho em curso',
    badgeTone: 'violet',
    badgeClass: 'bg-violet-500/15 text-violet-200 ring-violet-400/25',
    sectionClass: 'border-violet-500/20',
  },
  constraint: {
    id: 'constraint',
    label: 'Limites',
    description: 'Restrições, «não quero», limites claros',
    badgeTone: 'rose',
    badgeClass: 'bg-rose-500/15 text-rose-200 ring-rose-400/25',
    sectionClass: 'border-rose-500/20',
  },
  health: {
    id: 'health',
    label: 'Saúde & acessibilidade',
    description: 'Condições relevantes para como apoiar a pessoa',
    badgeTone: 'teal',
    badgeClass: 'bg-teal-500/15 text-teal-200 ring-teal-400/25',
    sectionClass: 'border-teal-500/20',
  },
  context: {
    id: 'context',
    label: 'Contexto',
    description: 'Local, rotina, factos situacionais úteis',
    badgeTone: 'slate',
    badgeClass: 'bg-slate-500/15 text-slate-200 ring-slate-400/25',
    sectionClass: 'border-slate-500/20',
  },
  other: {
    id: 'other',
    label: 'Outros',
    description: 'Factos úteis que não encaixam nas outras categorias',
    badgeTone: 'slate',
    badgeClass: 'bg-white/8 text-fg-dim ring-white/10',
    sectionClass: 'border-line-subtle',
  },
}

/** Ordem das secções no painel Memórias. */
export const MEMORY_KIND_ORDER: MemoryKindId[] = [
  'identity',
  'project',
  'preference',
  'constraint',
  'health',
  'context',
  'other',
]

export function isMemoryKindId(v: unknown): v is MemoryKindId {
  return (
    typeof v === 'string' &&
    (MEMORY_KIND_IDS as readonly string[]).includes(v)
  )
}

export function normalizeMemoryKind(v: unknown): MemoryKindId {
  return isMemoryKindId(v) ? v : 'other'
}

const TITLE_KIND_RULES: { pattern: RegExp; kind: MemoryKindId }[] = [
  { pattern: /^nome\b/i, kind: 'identity' },
  { pattern: /apelido|tratamento|pronome/i, kind: 'identity' },
  { pattern: /profiss[aã]o|papel/i, kind: 'identity' },
  { pattern: /prefer[eê]ncia|tom\b|idioma|gosto|evito/i, kind: 'preference' },
  {
    pattern: /projecto|projeto|luna|lumen|stack|desenvolvimento|app\b/i,
    kind: 'project',
  },
  { pattern: /restri|limite|n[aã]o quero|alergia/i, kind: 'constraint' },
  { pattern: /neuro|tdah|autismo|sa[uú]de|acessibil/i, kind: 'health' },
  { pattern: /localiza|moro em|vivo em|rotina/i, kind: 'context' },
]

/** Notas antigas sem `kind` — inferência leve pelo título. */
export function inferMemoryKindFromTitle(title: string): MemoryKindId {
  const t = title.trim()
  if (!t.length) return 'other'
  for (const { pattern, kind } of TITLE_KIND_RULES) {
    if (pattern.test(t)) return kind
  }
  return 'other'
}

export function memoryKindOfNote(note: {
  kind?: MemoryKindId
  title: string
}): MemoryKindId {
  if (note.kind && isMemoryKindId(note.kind)) return note.kind
  return inferMemoryKindFromTitle(note.title)
}

export function memoryKindsForPrompt(): string {
  return MEMORY_KIND_ORDER.map((id) => {
    const m = MEMORY_KIND_META[id]
    return `- \`${id}\`: ${m.label} — ${m.description}`
  }).join('\n')
}
