import { buildAgentStep } from '../../agent/buildAgentStep'
import type { ToolExecuteResult } from '../../agent/types'
import type { RagCitation } from '../../types/chat'

export function parseToolArgs(argsJson: string): Record<string, unknown> {
  try {
    const o = JSON.parse(argsJson) as Record<string, unknown>
    return o && typeof o === 'object' && !Array.isArray(o) ? o : {}
  } catch {
    return {}
  }
}

export function finishTool(
  tool: string,
  ok: boolean,
  content: string,
  args: Record<string, unknown>,
  raw: unknown,
  extras?: { citations?: RagCitation[] },
): ToolExecuteResult {
  const step = buildAgentStep(tool, ok, args, raw, extras)
  return {
    content,
    stepSummary: step.summary,
    ok,
    step,
  }
}
