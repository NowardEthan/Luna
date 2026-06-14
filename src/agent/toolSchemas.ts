import { assertBuiltinToolsRegistered } from '../core/tools/registerBuiltin'
import { toolRegistry } from '../core/registry/ToolRegistry'
import { FINANCES_TOOL_PREFIX } from './financesSystemSupplement'
import { IDE_TOOL_UI } from './tools/ideToolSchemas'

type ToolSchema = { function?: { name?: string } }

const FINANCES_EXTRA_TOOLS = new Set(['save_memory', 'configure_memories'])

export function getAgentToolSchemas(opts?: { financesOnly?: boolean }): unknown[] {
  assertBuiltinToolsRegistered()
  const all = toolRegistry.getSchemas() as ToolSchema[]
  if (!opts?.financesOnly) return all
  return all.filter((s) => {
    const name = s.function?.name ?? ''
    return name.startsWith(FINANCES_TOOL_PREFIX) || FINANCES_EXTRA_TOOLS.has(name)
  })
}

export function getToolUiLabels(): Record<string, string> {
  assertBuiltinToolsRegistered()
  return toolRegistry.getUiLabels()
}

export function getToolMeta(): Record<string, { label: string; badgeClass: string }> {
  assertBuiltinToolsRegistered()
  return { ...toolRegistry.getUiMeta(), ...IDE_TOOL_UI }
}

/** @deprecated use getAgentToolSchemas() */
export const AGENT_TOOL_SCHEMAS: unknown[] = []

/** @deprecated use getToolUiLabels() */
export const TOOL_UI_LABELS: Record<string, string> = {}

/** @deprecated use getToolMeta() */
export const TOOL_META: Record<string, { label: string; badgeClass: string }> = {}
