import type { AgentStepRecord } from '../types/chat'

export type IdeContinuityState = {
  userWantsAction: boolean
  userWantsCreate: boolean
  userWantsEdit: boolean
  userWantsRun: boolean
  userWantsGui: boolean
  promisedButIncomplete: boolean
  missingWriteForEdit: boolean
  missingRunForExecute: boolean
  incompleteMidTaskReply: boolean
  recoverableToolFailures: string[]
  informationalOnly: boolean
}

const ACTION_RE =
  /\b(cria|criar|escreve|escrever|gera|gerar|adiciona|implementa|faz|faça|rode|rodar|executa|executar|corre|correr|compila|instala|abre|lança|run|create|write|build|execute|atualiz|altera|modifica|edit|remove|tira|corrige|fix)\b/i

const CREATE_RE =
  /\b(cria|criar|escreve|novo ficheiro|new file|hello\.py)\b/i

const EDIT_RE =
  /\b(atualiz|altera|modifica|edit|remove|tira|emoji|emojis|corrige|fix|patch|substitui)\b/i

const RUN_RE =
  /\b(rodar|rode|executa|corre|run|testa|testar|gui|janela|terminal)\b/i

const GUI_RE =
  /\b(gui|interface gráfica|janela|tkinter|matplotlib|electron)\b/i

const PROMISE_RE =
  /\b(vou criar|vou rodar|vou executar|vou escrever|vou atualizar|vou modificar|vou ler|vou verificar|agora vou|a seguir vou|em seguida|vou fazer|vou abrir|deixa eu|deixa-me|preciso (ver|ler|verificar)|antes de (criar|escrever|atualizar))\b/i

const MID_TASK_REPLY_RE =
  /\b(deixa\s+(eu|me)|vou\s+(verificar|ler|criar|escrever|atualizar|modificar|rodar|executar|fazer)|preciso\s+(ver|ler|verificar)|agora\s+vou|a\s+seguir|em\s+seguida|primeiro\s+vou|antes\s+de|deixa\s+eu\s+ver)\b/i

const INFO_ONLY_RE =
  /^(?:só\s+)?(?:verifica|confirma|diz(?:-me)?|explica|o que é|está instalado|tem python|há python)\b/i

function hadSuccessfulTool(
  steps: AgentStepRecord[],
  tools: string[],
): boolean {
  return steps.some((s) => s.ok && tools.includes(s.tool))
}

function hadFailedTool(steps: AgentStepRecord[], tools: string[]): boolean {
  return steps.some((s) => !s.ok && tools.includes(s.tool))
}

export function assessIdeContinuity(
  userCaption: string,
  steps: AgentStepRecord[],
  lastAssistantText: string,
): IdeContinuityState {
  const cap = userCaption.trim()
  const text = lastAssistantText.trim()

  const userWantsCreate = CREATE_RE.test(cap)
  const userWantsEdit = EDIT_RE.test(cap) || userWantsCreate
  const userWantsRun = RUN_RE.test(cap)
  const userWantsGui = GUI_RE.test(cap)
  const userWantsAction =
    ACTION_RE.test(cap) || userWantsEdit || userWantsRun || userWantsGui
  const informationalOnly =
    INFO_ONLY_RE.test(cap) && !userWantsEdit && !userWantsGui && !userWantsRun

  const hasWrite = hadSuccessfulTool(steps, ['write_file', 'apply_patch'])
  const hasRun = hadSuccessfulTool(steps, ['run_terminal_command'])
  const hasRead = hadSuccessfulTool(steps, ['read_file'])

  const missingWriteForEdit =
    userWantsEdit && userWantsAction && !hasWrite && !informationalOnly

  const missingRunForExecute =
    (userWantsRun || userWantsGui) &&
    userWantsAction &&
    !hasRun &&
    !informationalOnly

  const promisedButIncomplete =
    PROMISE_RE.test(text) &&
    ((userWantsEdit && !hasWrite) ||
      (userWantsRun && !hasRun) ||
      (userWantsEdit && !hasRead && steps.length > 0))

  const incompleteMidTaskReply =
    MID_TASK_REPLY_RE.test(text) &&
    (missingWriteForEdit ||
      missingRunForExecute ||
      promisedButIncomplete ||
      (userWantsEdit && !hasWrite && steps.length > 0))

  const recoverableToolFailures: string[] = []
  if (hadFailedTool(steps, ['list_directory'])) {
    recoverableToolFailures.push('list_directory')
  }
  if (hadFailedTool(steps, ['read_file']) && userWantsEdit) {
    recoverableToolFailures.push('read_file')
  }
  if (hadFailedTool(steps, ['run_terminal_command']) && userWantsRun) {
    recoverableToolFailures.push('run_terminal_command')
  }
  if (hadFailedTool(steps, ['write_file', 'apply_patch']) && userWantsEdit) {
    recoverableToolFailures.push('write_file')
  }

  return {
    userWantsAction,
    userWantsCreate,
    userWantsEdit,
    userWantsRun,
    userWantsGui,
    promisedButIncomplete,
    missingWriteForEdit,
    missingRunForExecute,
    incompleteMidTaskReply,
    recoverableToolFailures,
    informationalOnly,
  }
}

export function shouldNudgeIdeContinuation(
  state: IdeContinuityState,
): boolean {
  if (state.informationalOnly) return false
  if (state.incompleteMidTaskReply) return true
  if (state.promisedButIncomplete) return true
  if (state.missingWriteForEdit) return true
  if (state.missingRunForExecute) return true
  if (state.recoverableToolFailures.length > 0 && state.userWantsAction) {
    return true
  }
  return false
}

export function buildIdeContinuationSystemHint(
  state: IdeContinuityState,
  workspaceRoot?: string,
): string {
  const parts: string[] = [
    '[Continuidade] A tarefa **não está concluída**. Não encerres o turno com promessas ou «vou verificar» — **usa tools agora** e só depois responde ao utilizador com o resultado.',
  ]
  if (state.missingWriteForEdit) {
    parts.push(
      'Falta: `read_file` (se precisares) e depois `write_file` / `apply_patch` para aplicar a alteração pedida.',
    )
  }
  if (state.missingRunForExecute) {
    parts.push(
      'Falta: `run_terminal_command` para executar/testar (com `gui: true` se for interface gráfica). Reporta exit code real.',
    )
  }
  if (state.incompleteMidTaskReply) {
    parts.push(
      'A tua última mensagem parece um passo intermédio — continua com ferramentas até terminar ou reportar erro concreto.',
    )
  }
  if (state.recoverableToolFailures.includes('list_directory')) {
    const root = workspaceRoot?.trim() || '.'
    parts.push(
      `Listagem falhou — tenta \`list_directory\` com path \`${root}\` ou \`glob\` / \`grep\`.`,
    )
  }
  if (state.recoverableToolFailures.includes('read_file')) {
    parts.push(
      'Leitura de ficheiro falhou — confirma o caminho (workspace) e tenta de novo ou usa `grep`.',
    )
  }
  if (state.recoverableToolFailures.includes('run_terminal_command')) {
    parts.push(
      'Comando no terminal falhou — corrige o comando/cwd, tenta outra variante e reporta o exit code.',
    )
  }
  if (state.recoverableToolFailures.includes('write_file')) {
    parts.push(
      'Escrita falhou — verifica path, permissões e conteúdo; tenta `apply_patch` se for edição parcial.',
    )
  }
  if (state.promisedButIncomplete) {
    parts.push(
      'Evita «deixa eu verificar» / «vou criar» sem a tool correspondente na mesma ronda.',
    )
  }
  return parts.join(' ')
}
