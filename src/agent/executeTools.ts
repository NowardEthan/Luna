import type { RagCitation } from '../types/chat'
import type { LlmToolCallMessage } from '../lib/togetherClient'
import { assertBuiltinToolsRegistered } from '../core/tools/registerBuiltin'
import { toolRegistry } from '../core/registry/ToolRegistry'
import { parseToolArgs, finishTool } from '../core/tools/toolResult'
import type { AgentTurnInput, ToolExecuteResult } from './types'

export type ToolSideEffects = {
  ragCitations?: RagCitation[]
  visionDescription?: string
  memorySaved: boolean
}

export async function executeToolCall(
  call: LlmToolCallMessage,
  ctx: AgentTurnInput,
  effects: ToolSideEffects,
): Promise<ToolExecuteResult> {
  assertBuiltinToolsRegistered()
  const name = call.function?.name ?? ''
  const args = parseToolArgs(call.function?.arguments ?? '{}')
  const tool = toolRegistry.get(name)
  if (!tool) {
    return finishTool(
      name,
      false,
      JSON.stringify({
        ok: false,
        error: `Ferramenta desconhecida: ${name}`,
      }),
      args,
      null,
    )
  }
  return tool.handler({ call, args, ctx, effects })
}
