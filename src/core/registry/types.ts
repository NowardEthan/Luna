import type { ReactNode } from 'react'
import type { AgentTurnInput, ToolExecuteResult } from '../../agent/types'
import type { ToolSideEffects } from '../../agent/executeTools'
import type { LlmToolCallMessage } from '../../lib/togetherClient'

export type ToolHandlerContext = {
  call: LlmToolCallMessage
  args: Record<string, unknown>
  ctx: AgentTurnInput
  effects: ToolSideEffects
}

export type ToolHandler = (
  input: ToolHandlerContext,
) => Promise<ToolExecuteResult>

export type ToolUiMeta = {
  label: string
  badgeClass: string
}

export type RegisteredTool = {
  name: string
  family: string
  schema: unknown
  handler: ToolHandler
  uiLabel?: string
  uiMeta?: ToolUiMeta
}

export type PanelContribution = {
  id: string
  label: string
  icon?: string
  order?: number
  render: () => ReactNode
}

export type CommandContribution = {
  id: string
  label: string
  keywords?: string
  run: () => void
}

export type ThemeContribution = {
  id: string
  label: string
  cssVars?: Record<string, string>
}
