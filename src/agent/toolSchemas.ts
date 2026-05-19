import { assertBuiltinToolsRegistered } from '../core/tools/registerBuiltin'
import { toolRegistry } from '../core/registry/ToolRegistry'
import { IDE_TOOL_UI } from './tools/ideToolSchemas'

export function getAgentToolSchemas(): unknown[] {
  assertBuiltinToolsRegistered()
  return toolRegistry.getSchemas()
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
