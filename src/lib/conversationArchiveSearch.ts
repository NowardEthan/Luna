import { deriveTitle } from './conversationStorage'
import { userContentForLlm } from './lunaMemory'
import type { Conversation } from '../types/chat'

/** Busca local (full-text leve) em todo o histórico guardado — “memória vertical” sem embeddings. */

export const VERTICAL_RECALL_MAX_CHARS = 3400
export const VERTICAL_RECALL_MAX_SEGMENTS = 12
/** Mínimo de “acertos” de termos da pergunta no trecho (evita ruído) */
export const VERTICAL_RECALL_MIN_SCORE = 1.2

const STOP = new Set([
  'a',
  'o',
  'os',
  'as',
  'um',
  'uma',
  'uns',
  'umas',
  'de',
  'do',
  'da',
  'dos',
  'das',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'por',
  'para',
  'pra',
  'com',
  'sem',
  'que',
  'se',
  'como',
  'mais',
  'menos',
  'muito',
  'muita',
  'foi',
  'ser',
  'estar',
  'tem',
  'ter',
  'já',
  'só',
  'também',
  'aqui',
  'isso',
  'esse',
  'essa',
  'esses',
  'essas',
  'ele',
  'ela',
  'eles',
  'elas',
  'eu',
  'tu',
  'você',
  'vc',
  'nós',
  'meu',
  'minha',
  'teu',
  'sua',
  'seu',
  'ao',
  'aos',
  'pelo',
  'pela',
  'pelos',
  'pelas',
  'entre',
  'sobre',
  'quando',
  'onde',
  'porque',
  'então',
  'né',
  'tá',
  'to',
  'tô',
  'lá',
  'sim',
  'não',
  'nao',
  'ok',
  'oi',
  'olá',
  'ola',
  'hey',
  'lembra',
  'lembrar',
  'falamos',
  'falei',
  'disse',
  'diz',
  'coisa',
  'coisas',
  'tipo',
  'gente',
  'cara',
])

function stripAccents(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

/** Termos significativos da pergunta (para bater no histórico) */
export function tokenizeForSearch(text: string): string[] {
  const raw = stripAccents(text)
  const parts = raw.split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 2)
  const out: string[] = []
  for (const t of parts) {
    if (STOP.has(t)) continue
    out.push(t)
  }
  return out
}

function scoreMatch(normBody: string, tokens: string[]): number {
  let s = 0
  for (const t of tokens) {
    if (t.length < 2) continue
    if (!normBody.includes(t)) continue
    s += 1 + Math.min(2.5, t.length / 5)
  }
  return s
}

function normalizeForMatch(s: string): string {
  return stripAccents(s).replace(/\s+/g, ' ')
}

type ScoredSeg = {
  convId: string
  convTitle: string
  kind: string
  excerpt: string
  score: number
}

function pushSegmentsForConversation(
  c: Conversation,
  tokens: string[],
  out: ScoredSeg[],
): void {
  if (!tokens.length) return
  const title =
    c.title.replace(/\s+/g, ' ').trim() || deriveTitle(c.messages)
  const normTitle = normalizeForMatch(title)

  const sum = c.memory?.rollingSummary?.trim()
  if (sum && sum.length > 0) {
    const nb = normalizeForMatch(sum)
    let sc = scoreMatch(nb, tokens) + scoreMatch(normTitle, tokens) * 0.35
    if (sc >= VERTICAL_RECALL_MIN_SCORE) {
      const excerpt =
        sum.length > 1400 ? `${sum.slice(0, 1398)}…` : sum
      out.push({
        convId: c.id,
        convTitle: title,
        kind: 'Resumo desta conversa',
        excerpt,
        score: sc,
      })
    }
  }

  for (const m of c.messages) {
    if (m.role !== 'user' && m.role !== 'assistant') continue
    const raw = userContentForLlm(m)
    const flat = raw.replace(/\s+/g, ' ').trim()
    if (!flat.length || flat === 'Pensando…') continue
    const nb = normalizeForMatch(flat)
    let sc = scoreMatch(nb, tokens) + scoreMatch(normTitle, tokens) * 0.25
    if (sc < VERTICAL_RECALL_MIN_SCORE) continue
    const role = m.role === 'user' ? 'Pessoa' : 'Luna'
    const excerpt =
      flat.length > 1200 ? `${flat.slice(0, 1198)}…` : flat
    out.push({
      convId: c.id,
      convTitle: title,
      kind: `Mensagem (${role})`,
      excerpt,
      score: sc,
    })
  }
}

/** Trechos do arquivo local de conversas que melhor batem com a pergunta atual. */
export function buildVerticalRecallBlock(
  query: string,
  conversations: Conversation[],
): string {
  const tokens = tokenizeForSearch(query)
  if (tokens.length === 0) return ''
  if (tokens.length === 1 && tokens[0].length < 4) return ''

  const scored: ScoredSeg[] = []
  for (const c of conversations) {
    pushSegmentsForConversation(c, tokens, scored)
  }
  if (!scored.length) return ''

  scored.sort((a, b) => b.score - a.score)

  const picked: ScoredSeg[] = []
  const perConv = new Map<string, number>()
  for (const seg of scored) {
    if (picked.length >= VERTICAL_RECALL_MAX_SEGMENTS) break
    const n = perConv.get(seg.convId) ?? 0
    if (n >= 3) continue
    picked.push(seg)
    perConv.set(seg.convId, n + 1)
  }

  const header =
    'Busca no arquivo de conversas (neste computador — trechos que mais combinam com a pergunta dela agora). ' +
    'Use só como apoio; não invente fora disso. Se não bater com o que ela quer, siga a conversa normalmente.\n'

  let body = ''
  let used = header.length
  for (const p of picked) {
    const line = `\n[${p.convTitle}] (${p.kind}, relevância local)\n${p.excerpt}\n`
    if (used + line.length > VERTICAL_RECALL_MAX_CHARS) break
    body += line
    used += line.length
  }
  if (!body.trim()) return ''
  return header.trimEnd() + body
}

/** Teto para bloco combinado (embeddings + palavras-chave) no system prompt */
export const MERGED_VERTICAL_RECALL_MAX_CHARS = 5200

export function mergeVerticalRecallBlocks(
  semanticBlock: string,
  keywordBlock: string,
  maxChars: number,
): string {
  const sem = semanticBlock.trim()
  const kw = keywordBlock.trim()
  const parts: string[] = []
  if (sem) {
    parts.push(
      'Recuperação por significado (embeddings — conversas indexadas neste computador):\n' +
        sem,
    )
  }
  if (kw) {
    parts.push(kw)
  }
  if (!parts.length) return ''
  let out = parts.join('\n\n---\n\n')
  if (out.length > maxChars) out = out.slice(0, maxChars - 1) + '…'
  return out
}
