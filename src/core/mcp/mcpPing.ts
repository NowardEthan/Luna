import { listMcpTools, type McpToolMeta } from './mcpClient'
import type { McpServerConfig } from './storage'

export type McpPingResult =
  | { status: 'ok'; tools: string[]; metas?: McpToolMeta[] }
  | { status: 'error'; message: string }

export async function pingMcpServer(
  server: McpServerConfig,
): Promise<McpPingResult> {
  const list = await listMcpTools(server)
  if (list.status === 'error') {
    return { status: 'error', message: list.message }
  }
  return {
    status: 'ok',
    tools: list.tools.map((t) => t.name),
    metas: list.tools,
  }
}
