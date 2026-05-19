import type { Message } from '../types/chat'
import { userContentForLlm } from './lunaMemory'

/** Valores aceites no JSON do planeador (fallback para `mixed`). */
export const TURN_KINDS = [
  'meta',
  'intimate',
  'technical',
  'playful',
  'mixed',
] as const

export type TurnKind = (typeof TURN_KINDS)[number]

export type LunaTurnPlan = {
  turn_kind: TurnKind
  /** Uma frase: o que a pessoa parece querer neste turno. */
  user_goal_guess: string
  /** Tom/postura da Luna nesta resposta. */
  luna_stance: string
  /** Se true, a resposta deve perguntar (em texto) se a pessoa quer guardar na memória — não substitui save_memory. */
  memory_consent_prompt: boolean
  /** Etiquetas curtas do que evitar (ex.: tom_FAQ, bullets). */
  avoid: string[]
  /** Opcional: short | normal | long */
  reply_length?: 'short' | 'normal' | 'long'
  /** Modo IDE: passos até concluir (explorar → ler → editar → testar). */
  task_steps?: string[]
}

export const PLANNING_SYSTEM_PROMPT =
  'És o planeador **interno** da Luna (app Luna v1). Não escreves para a pessoa. Não és a Luna na conversa.\n\n' +
  'A tua única saída é **um objecto JSON válido** (sem markdown, sem texto antes ou depois) com exactamente estas chaves:\n' +
  '- `turn_kind`: uma de: "meta", "intimate", "technical", "playful", "mixed".\n' +
  '- `user_goal_guess`: uma frase curta em português do Brasil.\n' +
  '- `luna_stance`: uma frase curta: como a Luna deve **estar** nesta resposta (ex.: presente, curiosa, leve, séria sobre o erro).\n' +
  '- `memory_consent_prompt`: boolean. true se for altamente pessoal, relacional ou existencial (criador, testes emocionais, “quem és”) **e** faz sentido **perguntar** se quer guardar na memória; false para papo normal ou técnico seco.\n' +
  '- `avoid`: array de 2 a 5 strings curtas em snake_case (ex.: "tom_FAQ", "validacao_vazia", "lista_bullets", "arquivo_sem_empatia").\n' +
  '- `reply_length` (opcional): "short", "normal" ou "long". **Por defeito use "normal"**; use "short" só se a mensagem da pessoa pedir brevidade explícita ou for um sim/não trivial; use "long" quando o assunto claramente pede desenvolvimento (história, explicação longa, desabafo).\n\n' +
  'Regras: não inventes factos sobre a pessoa; baseia-te só no bloco que recebes. Alinha com a política da Luna: memória consentida (perguntar no texto quando fizer sentido), anti-CRM existencial, honestidade situada. Se tiveres dúvida, `turn_kind` = "mixed", `memory_consent_prompt` = false e `reply_length` = "normal".'

export const IDE_PLANNING_SYSTEM_PROMPT =
  PLANNING_SYSTEM_PROMPT +
  '\n\nModo **IDE** (pair programming): acrescenta a chave `task_steps`: array de 3 a 7 strings curtas em português com o plano até **concluir** (ex.: explorar pasta, ler ficheiro, editar, correr teste, resumir). ' +
  'Inclui verificação no terminal quando o pedido implicar executar ou testar. A Luna principal deve seguir estes passos com tools antes de responder só em texto.'

const TURN_KIND_SET = new Set<string>(TURN_KINDS)

function normalizeAvoid(v: unknown): string[] {
  if (!Array.isArray(v)) return ['tom_FAQ', 'resposta_rasa']
  const out = v
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim().slice(0, 48))
    .filter(Boolean)
    .slice(0, 5)
  return out.length >= 2 ? out : [...out, 'tom_FAQ', 'resposta_rasa'].slice(0, 5)
}

function extractJsonObject(raw: string): string | null {
  const t = raw.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t)
  if (fence) return fence[1].trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  return t.slice(start, end + 1)
}

/**
 * Interpreta a resposta do planeador. Devolve `null` se inválido (o fluxo principal segue sem hints).
 */
export function parsePlanningJson(raw: string): LunaTurnPlan | null {
  const jsonStr = extractJsonObject(raw)
  if (!jsonStr) return null
  let o: unknown
  try {
    o = JSON.parse(jsonStr) as unknown
  } catch {
    return null
  }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null
  const rec = o as Record<string, unknown>

  const tk = typeof rec.turn_kind === 'string' ? rec.turn_kind : 'mixed'
  const turn_kind = TURN_KIND_SET.has(tk)
    ? (tk as TurnKind)
    : 'mixed'

  const user_goal_guess =
    typeof rec.user_goal_guess === 'string'
      ? rec.user_goal_guess.replace(/\s+/g, ' ').trim().slice(0, 220)
      : ''
  const luna_stance =
    typeof rec.luna_stance === 'string'
      ? rec.luna_stance.replace(/\s+/g, ' ').trim().slice(0, 220)
      : ''

  if (!user_goal_guess.length || !luna_stance.length) return null

  const memory_consent_prompt = rec.memory_consent_prompt === true

  const rl = rec.reply_length
  const reply_length =
    rl === 'short' || rl === 'normal' || rl === 'long' ? rl : undefined

  let task_steps: string[] | undefined
  if (Array.isArray(rec.task_steps)) {
    const steps = rec.task_steps
      .filter((x): x is string => typeof x === 'string')
      .map((x) => x.trim().slice(0, 120))
      .filter(Boolean)
      .slice(0, 7)
    if (steps.length >= 2) task_steps = steps
  }

  return {
    turn_kind,
    user_goal_guess,
    luna_stance,
    memory_consent_prompt,
    avoid: normalizeAvoid(rec.avoid),
    reply_length,
    ...(task_steps ? { task_steps } : {}),
  }
}

const AVOID_HINTS: Record<string, string> = {
  tom_FAQ: 'evitar tom de FAQ ou manual',
  validacao_vazia: 'evitar “entendi/perfeito” vazio sem conteúdo',
  lista_bullets: 'evitar listas com bullets salvo a pessoa pedir',
  arquivo_sem_empatia: 'não tratar revelação pessoal só como dado a arquivar',
  meta_excesso: 'não ficar a explicar arquitectura em demasia sem necessidade',
  resposta_rasa: 'evitar só duas frases genéricas; desenvolver um pouco',
}

function avoidToPortuguese(tags: string[]): string {
  const lines = tags.map((t) => AVOID_HINTS[t] ?? t.replace(/_/g, ' '))
  return lines.join('; ')
}

/**
 * Bloco injectado no system da chamada principal (resposta visível). A Luna não deve citá-lo literalmente.
 */
export function formatPlanningHintForMainSystem(plan: LunaTurnPlan): string {
  const mem =
    plan.memory_consent_prompt
      ? 'Se fizer sentido no fecho, pergunta com naturalidade se a pessoa **quer** que isso fique guardado na memória do app (sem apelidar de “ferramenta”).'
      : 'Não forces pergunta sobre gravar na memória neste turno.'
  const len =
    plan.reply_length === 'short'
      ? 'Resposta **curta** neste turno (pedido explícito ou trivial).'
      : plan.reply_length === 'long'
        ? 'Podes **alongar**: vários parágrafos se o assunto pedir; não tenhas pressa de fechar.'
        : 'Extensão **normal**: preferir **dois a quatro parágrafos** com ritmo natural; evitar resposta rasa de só duas frases; pode incluir um detalhe ou exemplo concreto quando couber.'

  const steps =
    plan.task_steps?.length
      ? `Plano até concluir (usa tools em cada passo; não pares no meio):\n${plan.task_steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`
      : ''

  return (
    '\n\n--- Orientação interna deste turno (não cites este bloco; integra só no tom e nas escolhas) ---\n' +
    `Tipo de turno: ${plan.turn_kind}.\n` +
    `O que a pessoa parece querer: ${plan.user_goal_guess}\n` +
    `Como estar nesta resposta: ${plan.luna_stance}\n` +
    steps +
    `${mem}\n` +
    `Evitar: ${avoidToPortuguese(plan.avoid)}.\n` +
    `${len}\n` +
    'Não respondas ao utilizador com «vou verificar» ou «deixa eu ver» sem usar tools no mesmo turno — executa o plano até ao fim ou reporta erro concreto.\n'
  )
}

/** Últimas mensagens compactas para o planeador (só texto). */
export function buildPlanningUserBlock(
  verbatimTail: Message[],
  pendingContent: string,
  maxMessages = 6,
): string {
  const tail = verbatimTail.slice(-maxMessages)
  const lines: string[] = []
  for (const m of tail) {
    const label = m.role === 'user' ? 'Pessoa' : 'Luna'
    let text = userContentForLlm(m).replace(/\s+/g, ' ').trim()
    if (m.role === 'assistant' && text === 'Pensando…') continue
    if (text.length > 320) text = `${text.slice(0, 317)}…`
    if (text.length) lines.push(`${label}: ${text}`)
  }
  const history = lines.length
    ? `Últimas falas (mais recente por último):\n${lines.join('\n')}`
    : '(Sem histórico recente neste trecho.)'
  return (
    `${history}\n\n---\n\nMensagem actual da pessoa a responder:\n${pendingContent}`
  )
}
