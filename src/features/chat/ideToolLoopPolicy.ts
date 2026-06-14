import type { IdeAttachedContext } from '../../lib/ideMentions'
import type { ForgeComposerMode } from '../../lib/forgeComposerMode'
import type { LunaCoreResultado } from '../../types/lunaCoreResult'

const TOOL_INTENT_RE =
  /\b(grep|glob|apply_patch|read_file|write_file|run_terminal|npm\s+run|powershell|git\s+(?:status|diff|commit)|lista(?:r)?\s+(?:os\s+)?ficheiros|listar\s+arquivos|cria(?:r)?\s+ficheiro|editar\s+ficheiro|executa(?:r)?\s+comando|procura(?:r)?\s+no\s+projecto)\b/i

/** Pedido explícito de criar/alterar algo no workspace (mesmo sem keywords de tool). */
const FORGE_ACTION_VERB_RE =
  /\b(cria(?:r)?|gera(?:r)?|adiciona(?:r)?|estrutura(?:r)?|configura(?:r)?|monta(?:r)?|scaffold|setup|escreve(?:r)?|implementa(?:r)?|faz(?:er)?|faça|faz)\b/i

const FORGE_ACTION_TARGET_RE =
  /\b(\.env[\w.-]*|\.gitignore|dockerfile|package\.json|pyproject\.toml|ficheiro|arquivo|pasta|folder|config|estrutura|readme|requirements\.txt|tsconfig)\b/i

const FORGE_DELEGATION_RE =
  /\b(consegue|podes|pode|ajuda(?:-me)?)\b[\s\S]{0,120}\b(para mim|neste projeto|no projeto|aqui|nele|primeiro)\b/i

/** Utilizador pediu acção no disco — activar agente em modo Agente. */
export function userRequestsForgeAction(userText: string): boolean {
  const t = userText.trim()
  if (!t) return false
  if (TOOL_INTENT_RE.test(t)) return true
  if (FORGE_ACTION_VERB_RE.test(t) && FORGE_ACTION_TARGET_RE.test(t)) return true
  if (/\.env/i.test(t) && FORGE_ACTION_VERB_RE.test(t)) return true
  if (
    FORGE_DELEGATION_RE.test(t) &&
    (FORGE_ACTION_VERB_RE.test(t) || FORGE_ACTION_TARGET_RE.test(t))
  ) {
    return true
  }
  return false
}

const REVIEW_WORKSPACE_RE =
  /\b(olha(?:r)?|analisa(?:r)?|revê|revisa(?:r)?|examina(?:r)?|dá?\s+uma\s+olhada|da\s+uma\s+olhada|verifica(?:r)?|lê|ler|abre|abrir|mostra(?:r)?|explica(?:r)?|corrige(?:r)?|melhora(?:r)?|refatora(?:r)?)\b/i

const CORE_TOOL_STUB_RE =
  /^\s*\{[\s\S]*"(?:action|tool)"\s*:\s*"(?:read_file|write_file|grep|glob|apply_patch|run_terminal)/i

/** Core por vezes devolve JSON de tool em texto — não mostrar ao utilizador. */
export function coreResponseLooksLikeToolStub(
  resultado: LunaCoreResultado,
): boolean {
  const text = resultado.resposta?.texto?.trim() ?? ''
  return CORE_TOOL_STUB_RE.test(text)
}

function normalizeToken(v?: string): string {
  return (v ?? '').trim().toLowerCase().replace(/\s+/g, '_')
}

/**
 * Revisão de @ficheiro — uma chamada LLM leve (sem tools, menos TPM).
 * Ex.: «@modelo.py da uma olhada».
 */
export function shouldRunIdeLightReview(
  userText: string,
  mentions: IdeAttachedContext[] = [],
): boolean {
  const hasFile = mentions.some((m) => m.kind === 'file')
  if (!hasFile) return false
  if (TOOL_INTENT_RE.test(userText)) return false
  if (REVIEW_WORKSPACE_RE.test(userText)) return true
  return mentions.length >= 1 && userText.length <= 220
}

/** Decide se o turno IDE deve continuar no agente com ferramentas (I5.6). */
export function shouldRunIdeAgentLoop(
  resultado: LunaCoreResultado,
  userText: string,
  mentions: IdeAttachedContext[] = [],
  composerMode: ForgeComposerMode = 'agent',
): boolean {
  if (composerMode === 'chat') return false
  if (shouldRunIdeLightReview(userText, mentions)) return false

  if (userRequestsForgeAction(userText)) return true

  if (coreResponseLooksLikeToolStub(resultado)) return true

  const acao = normalizeToken(resultado.pipeline?.politica?.acao)
  if (
    acao === 'usar_ferramenta' ||
    acao === 'executar' ||
    acao === 'executar_ferramenta'
  ) {
    return true
  }

  const intencao = normalizeToken(resultado.analise?.analise?.intencao)
  const modo = normalizeToken(resultado.pipeline?.politica?.modo)
  const pedidoCodigo =
    intencao === 'pedido_codigo' || modo === 'pedido_codigo'

  const hasPathMention = mentions.some(
    (m) => m.kind === 'file' || m.kind === 'folder',
  )
  if (
    hasPathMention &&
    pedidoCodigo &&
    !shouldRunIdeLightReview(userText, mentions)
  ) {
    return true
  }

  if (TOOL_INTENT_RE.test(userText)) return true

  const complexidade = normalizeToken(resultado.analise?.analise?.complexidade)
  if (complexidade === 'alta' || complexidade === 'high') return true

  return false
}
