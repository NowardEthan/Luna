import type { AgentStepRecord } from '../types/chat'
import {
  assessIdeContinuity,
  buildIdeContinuationSystemHint,
  shouldNudgeIdeContinuation,
  type IdeContinuityState,
} from './ideTaskContinuity'
import { IDE_ORCHESTRATION_HINT } from './ideSystemSupplement'

export type AgentPhase =
  | 'planning'
  | 'exploring'
  | 'acting'
  | 'verifying'
  | 'synthesizing'
  | 'done'

export type AgentTurnBudget = {
  maxLlmRounds: number
  maxToolCalls: number
  maxContinuationNudges: number
  maxSameToolRepeats: number
}

export type LoopExitDecision =
  | 'continue'
  | 'synthesize'
  | 'exit_ok'
  | 'exit_budget'
  | 'exit_stuck'

const EXPLORING_TOOLS = new Set([
  'read_file',
  'grep',
  'glob',
  'list_directory',
  'search_codebase',
  'search_documents',
])
const ACTING_TOOLS = new Set(['write_file', 'apply_patch'])
const VERIFYING_TOOLS = new Set(['run_terminal_command'])

export const DEFAULT_IDE_BUDGET: AgentTurnBudget = {
  maxLlmRounds: 25,
  maxToolCalls: 60,
  maxContinuationNudges: 4,
  maxSameToolRepeats: 3,
}

export const DEFAULT_CHAT_BUDGET: AgentTurnBudget = {
  maxLlmRounds: 8,
  maxToolCalls: 20,
  maxContinuationNudges: 0,
  maxSameToolRepeats: 3,
}

export function readAgentTurnBudget(
  mode: 'ide' | 'chat' | undefined,
): AgentTurnBudget {
  if (mode !== 'ide') return DEFAULT_CHAT_BUDGET
  const base = { ...DEFAULT_IDE_BUDGET }
  try {
    const env = import.meta.env as Record<string, string | undefined>
    const rounds = Number(env.VITE_LUNA_IDE_MAX_LLM_ROUNDS)
    const tools = Number(env.VITE_LUNA_IDE_MAX_TOOL_CALLS)
    if (Number.isFinite(rounds) && rounds >= 4) {
      base.maxLlmRounds = Math.floor(rounds)
    }
    if (Number.isFinite(tools) && tools >= 8) {
      base.maxToolCalls = Math.floor(tools)
    }
  } catch {
    /* ignore */
  }
  return base
}

export function inferAgentPhase(
  steps: AgentStepRecord[],
  pendingSynthesis: boolean,
): AgentPhase {
  if (pendingSynthesis) return 'synthesizing'
  if (!steps.length) return 'exploring'
  const last = steps[steps.length - 1]
  if (VERIFYING_TOOLS.has(last.tool) && last.ok) return 'done'
  if (ACTING_TOOLS.has(last.tool)) return 'verifying'
  if (EXPLORING_TOOLS.has(last.tool)) {
    const hasWrite = steps.some((s) => s.ok && ACTING_TOOLS.has(s.tool))
    return hasWrite ? 'verifying' : 'exploring'
  }
  return 'acting'
}

export function phaseStatusLabel(phase: AgentPhase): string {
  switch (phase) {
    case 'exploring':
      return 'A explorar…'
    case 'acting':
      return 'A editar…'
    case 'verifying':
      return 'A verificar…'
    case 'synthesizing':
      return 'A escrever resposta…'
    case 'planning':
      return 'A planear…'
    case 'done':
      return 'A concluir…'
    default:
      return 'A processar…'
  }
}

function toolCallFingerprint(tool: string, argsJson: string): string {
  return `${tool}::${argsJson.trim().slice(0, 200)}`
}

export function recordToolFailure(
  map: Map<string, number>,
  tool: string,
  argsJson: string,
): number {
  const key = toolCallFingerprint(tool, argsJson)
  const next = (map.get(key) ?? 0) + 1
  map.set(key, next)
  return next
}

export function isStuckOnRepeatedFailures(
  map: Map<string, number>,
  budget: AgentTurnBudget,
): boolean {
  for (const count of map.values()) {
    if (count >= budget.maxSameToolRepeats) return true
  }
  return false
}

export type ShouldExitLoopInput = {
  workbenchMode: 'ide' | 'chat' | undefined
  lastText: string
  hasToolCalls: boolean
  pendingSynthesis: boolean
  hadResearch: boolean
  userCaption: string
  agentSteps: AgentStepRecord[]
  budget: AgentTurnBudget
  llmRound: number
  toolCallsTotal: number
  continuationNudges: number
  failureMap: Map<string, number>
}

export function shouldExitLoop(input: ShouldExitLoopInput): LoopExitDecision {
  const {
    workbenchMode,
    lastText,
    hasToolCalls,
    pendingSynthesis,
    hadResearch,
    userCaption,
    agentSteps,
    budget,
    llmRound,
    toolCallsTotal,
    continuationNudges,
    failureMap,
  } = input

  if (hasToolCalls) return 'continue'

  if (isStuckOnRepeatedFailures(failureMap, budget)) {
    return 'exit_stuck'
  }

  if (llmRound >= budget.maxLlmRounds || toolCallsTotal >= budget.maxToolCalls) {
    return 'exit_budget'
  }

  if (pendingSynthesis && hadResearch) {
    if (!lastText.trim()) return 'synthesize'
    if (lastText.trim().length < 120) return 'synthesize'
    return 'exit_ok'
  }

  if (workbenchMode !== 'ide') {
    if (lastText.trim()) return 'exit_ok'
    return 'continue'
  }

  const continuity = assessIdeContinuity(
    userCaption,
    agentSteps,
    lastText,
  )

  if (!lastText.trim()) {
    if (shouldNudgeIdeContinuation(continuity)) {
      return continuationNudges < budget.maxContinuationNudges
        ? 'continue'
        : 'exit_budget'
    }
    return 'continue'
  }

  if (shouldNudgeIdeContinuation(continuity)) {
    if (continuationNudges < budget.maxContinuationNudges) {
      return 'continue'
    }
    return 'exit_budget'
  }

  return 'exit_ok'
}

export function buildContinuationNudge(
  continuity: IdeContinuityState,
  workspaceRoot?: string,
): string {
  return (
    IDE_ORCHESTRATION_HINT +
    '\n\n' +
    buildIdeContinuationSystemHint(continuity, workspaceRoot)
  )
}

export function buildStuckExitMessage(agentSteps: AgentStepRecord[]): string {
  const failed = agentSteps.filter((s) => !s.ok)
  const names = [...new Set(failed.map((s) => s.label))].slice(0, 4)
  const detail =
    names.length > 0
      ? ` Ferramentas que falharam repetidamente: ${names.join(', ')}.`
      : ''
  return (
    'Parei porque a mesma acção falhou várias vezes sem progresso.' +
    detail +
    ' Reformula o pedido, corrige o caminho do workspace, ou tenta um passo de cada vez.'
  )
}

export function buildBudgetExitMessage(
  continuity: IdeContinuityState,
  agentSteps: AgentStepRecord[],
): string {
  const hints: string[] = [
    'Usei o limite de passos deste turno sem concluir tudo.',
  ]
  if (continuity.missingWriteForCreate) {
    hints.push('Faltou criar/alterar o ficheiro (`write_file` / `apply_patch`).')
  }
  if (continuity.missingRunForExecute) {
    hints.push('Faltou executar no terminal (`run_terminal_command`).')
  }
  const failed = agentSteps.filter((s) => !s.ok)
  if (failed.length) {
    hints.push(
      `Últimas falhas: ${failed
        .slice(-3)
        .map((s) => s.label)
        .join(', ')}.`,
    )
  }
  hints.push('Podes pedir para continuar de onde parei.')
  return hints.join(' ')
}
