import { applyHeuristicMemoryCapture } from './heuristicMemoryCapture'
import { formatMemoryNotesBlock } from '../lib/lunaMemory'
import {
  readAutoMemoryCaptureEnabled,
  shouldReviewMemoryForTurn,
  userAskedToRemember,
} from '../lib/memoryPreferences'
import { SAVE_MEMORY_TOOLS } from '../lib/lunaMemoryTools'
import { completeLlmChat } from '../lib/togetherClient'
import type { AgentStepRecord } from '../types/chat'
import { executeToolCall, type ToolSideEffects } from './executeTools'
import type { AgentTurnInput } from './types'

const REVIEW_SYSTEM =
  'És o curador de memória da Luna (app local). Recebes a última troca da conversa. ' +
  'A tua única tarefa: identificar **1 a 3 factos estáveis** que valem a pena guardar para chats futuros ' +
  '(nome, preferências, projectos, papel profissional, restrições, pedidos de lembrar, condições que a pessoa mencionou). ' +
  'Se houver, chama **save_memory** uma vez por facto (title + detail curtos). ' +
  'Não graves cumprimentos vazios nem flirt genérico. ' +
  'Em dúvida sobre um facto claro (ex.: nome, “sou programador”, “trabalho na Luna”), **grava**. ' +
  'Se não houver nada útil, responde só SKIP (sem ferramentas).'

function turnUsedSaveMemory(steps: AgentStepRecord[]): boolean {
  return steps.some((s) => s.tool === 'save_memory' && s.ok)
}

/**
 * Segunda passagem: heurísticas locais + LLM leve se o modelo principal não gravou.
 */
export async function autoCaptureMemoriesIfNeeded(
  ctx: AgentTurnInput,
  input: {
    userText: string
    assistantText: string
    agentSteps: AgentStepRecord[]
  },
  effects: ToolSideEffects,
): Promise<boolean> {
  if (!readAutoMemoryCaptureEnabled()) return false
  if (turnUsedSaveMemory(input.agentSteps)) return false

  const userText = input.userText.trim()
  const assistantText = input.assistantText.trim()
  const explicit = userAskedToRemember(userText)
  const reviewWorthy = shouldReviewMemoryForTurn(userText)

  if (!explicit && !reviewWorthy) return false

  const heuristic = applyHeuristicMemoryCapture(
    userText,
    ctx.getMemoryNotes() ?? [],
    ctx.assistantMsgId,
    ctx.nextId,
  )
  if (heuristic.saved) {
    ctx.setMemoryNotes(heuristic.notes)
    effects.memorySaved = true
    return true
  }

  // 2.ª chamada LLM só quando pediu explicitamente para lembrar (evita +3–8s por turno).
  if (!explicit) return false

  const existingNotes = formatMemoryNotesBlock(ctx.getMemoryNotes(), 900)

  const res = await completeLlmChat(
    [
      { role: 'system', content: REVIEW_SYSTEM },
      {
        role: 'user',
        content:
          (existingNotes ? `${existingNotes}\n\n---\n\n` : '') +
          `Última mensagem da pessoa:\n${userText}\n\n` +
          `Resposta da Luna (já enviada):\n${assistantText.slice(0, 2400)}\n\n` +
          (explicit
            ? 'A pessoa pediu para lembrar — grava o que ela quer guardar.\n'
            : 'Se houver factos novos sobre quem ela é ou o que está a construir, grava.\n'),
      },
    ],
    {
      temperature: 0.15,
      maxCompletionTokens: 700,
      tools: SAVE_MEMORY_TOOLS,
      tool_choice: 'auto',
      reasoningEnabled: false,
    },
  )

  if (!res.ok) return false
  if (/^\s*skip\s*$/i.test(res.text.trim()) && !res.toolCalls?.length) {
    return false
  }
  if (!res.toolCalls?.length) return false

  let anySaved = false
  for (const call of res.toolCalls) {
    if (call.function?.name !== 'save_memory') continue
    const result = await executeToolCall(call, ctx, effects)
    if (result.ok) anySaved = true
  }

  return anySaved
}
