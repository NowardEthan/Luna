import type { AgentStepRecord } from '../types/chat'

export type IdeContinuityState = {
  userWantsAction: boolean
  userWantsCreate: boolean
  userWantsRun: boolean
  userWantsGui: boolean
  promisedButIncomplete: boolean
  missingWriteForCreate: boolean
  missingRunForExecute: boolean
  recoverableToolFailures: string[]
  informationalOnly: boolean
}

const ACTION_RE =
  /\b(cria|criar|escreve|escrever|gera|gerar|adiciona|implementa|faz|faça|rode|rodar|executa|executar|corre|correr|compila|instala|abre|lança|run|create|write|build|execute)\b/i

const CREATE_RE =
  /\b(cria|criar|escreve|ficheiro|arquivo|script|hello\.py|novo ficheiro|new file)\b/i

const RUN_RE =
  /\b(rodar|rode|executa|corre|run|testa|testar|gui|janela|terminal)\b/i

const GUI_RE =
  /\b(gui|interface gráfica|janela|tkinter|matplotlib|electron)\b/i

const PROMISE_RE =
  /\b(vou criar|vou rodar|vou executar|vou escrever|agora vou|a seguir vou|em seguida|vou fazer|vou abrir)\b/i

const INFO_ONLY_RE =
  /^(?:só\s+)?(?:verifica|confirma|diz(?:-me)?|explica|o que é|está instalado|tem python|há python)\b/i

function hadSuccessfulTool(
  steps: AgentStepRecord[],
  tools: string[],
): boolean {
  return steps.some((s) => s.ok && tools.includes(s.tool))
}

function hadFailedListDirectory(steps: AgentStepRecord[]): boolean {
  return steps.some((s) => s.tool === 'list_directory' && !s.ok)
}

export function assessIdeContinuity(
  userCaption: string,
  steps: AgentStepRecord[],
  lastAssistantText: string,
): IdeContinuityState {
  const cap = userCaption.trim()
  const text = lastAssistantText.trim()

  const userWantsAction = ACTION_RE.test(cap)
  const userWantsCreate = CREATE_RE.test(cap)
  const userWantsRun = RUN_RE.test(cap)
  const userWantsGui = GUI_RE.test(cap)
  const informationalOnly =
    INFO_ONLY_RE.test(cap) && !userWantsCreate && !userWantsGui

  const hasWrite = hadSuccessfulTool(steps, [
    'write_file',
    'apply_patch',
  ])
  const hasRun = hadSuccessfulTool(steps, ['run_terminal_command'])

  const promisedButIncomplete =
    PROMISE_RE.test(text) &&
    ((userWantsCreate && !hasWrite) || (userWantsRun && !hasRun))

  const missingWriteForCreate =
    userWantsCreate && userWantsAction && !hasWrite && !informationalOnly

  const missingRunForExecute =
    (userWantsRun || userWantsGui) &&
    userWantsAction &&
    !hasRun &&
    !informationalOnly

  const recoverableToolFailures: string[] = []
  if (hadFailedListDirectory(steps)) {
    recoverableToolFailures.push('list_directory')
  }

  return {
    userWantsAction,
    userWantsCreate,
    userWantsRun,
    userWantsGui,
    promisedButIncomplete,
    missingWriteForCreate,
    missingRunForExecute,
    recoverableToolFailures,
    informationalOnly,
  }
}

export function shouldNudgeIdeContinuation(
  state: IdeContinuityState,
): boolean {
  if (state.informationalOnly) return false
  if (state.promisedButIncomplete) return true
  if (state.missingWriteForCreate) return true
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
    '[Continuidade IDE] A tarefa **não está concluída**. Não respondas só com promessas — usa tools **nesta ronda** ou na seguinte.',
  ]
  if (state.missingWriteForCreate) {
    parts.push(
      'Falta: `write_file` ou `apply_patch` para criar/alterar o código pedido.',
    )
  }
  if (state.missingRunForExecute) {
    parts.push(
      'Falta: `run_terminal_command` para executar/testar (com `gui: true` se for interface gráfica). Reporta exit code real.',
    )
  }
  if (state.recoverableToolFailures.includes('list_directory')) {
    const root = workspaceRoot?.trim() || '.'
    parts.push(
      `A listagem de pasta falhou — usa \`list_directory\` com path \`${root}\` (raiz do workspace).`,
    )
  }
  if (state.promisedButIncomplete) {
    parts.push(
      'Evita frases como «vou criar» sem chamar a tool imediatamente a seguir.',
    )
  }
  return parts.join(' ')
}
