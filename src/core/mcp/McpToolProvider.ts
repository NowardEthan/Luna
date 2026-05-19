import { finishTool } from '../tools/toolResult'
import { toolRegistry } from '../registry/ToolRegistry'
import {
  invokeMcpTool,
  listMcpTools,
  mcpRegistryToolName,
  parseMcpRegistryName,
  type McpToolMeta,
} from './mcpClient'
import { readMcpServers, type McpServerConfig } from './storage'

export type McpToolDescriptor = {
  name: string
  serverId: string
  description?: string
}

type McpBinding = {
  server: McpServerConfig
  toolName: string
  meta: McpToolMeta
}

function defaultParameters(): Record<string, unknown> {
  return {
    type: 'object',
    properties: {},
    additionalProperties: true,
  }
}

function buildSchema(name: string, meta: McpToolMeta, server: McpServerConfig) {
  const params =
    meta.parameters && typeof meta.parameters === 'object'
      ? meta.parameters
      : defaultParameters()
  return {
    type: 'function',
    function: {
      name,
      description:
        meta.description?.trim() ||
        `Ferramenta MCP «${meta.name}» no servidor «${server.name}»`,
      parameters: params,
    },
  }
}

/** Liga servidores MCP e regista ferramentas no ToolRegistry. */
export class McpToolProvider {
  private connected = false
  private registered: string[] = []
  private bindings = new Map<string, McpBinding>()

  async connect(): Promise<void> {
    if (this.connected) return
    this.disconnect()

    const servers = readMcpServers().filter((s) => s.enabled)
    for (const server of servers) {
      const list = await listMcpTools(server)
      if (list.status === 'error') continue

      for (const meta of list.tools) {
        const name = mcpRegistryToolName(server.id, meta.name)
        if (toolRegistry.has(name)) continue

        this.bindings.set(name, {
          server,
          toolName: meta.name,
          meta,
        })

        toolRegistry.register({
          name,
          family: 'mcp',
          schema: buildSchema(name, meta, server),
          uiLabel: `MCP ${server.name}`,
          handler: async ({ args }) => {
            const binding = this.bindings.get(name)
            if (!binding) {
              return finishTool(
                name,
                false,
                JSON.stringify({ ok: false, error: 'Servidor MCP desligado.' }),
                args,
                null,
              )
            }
            const result = await invokeMcpTool(
              binding.server,
              binding.toolName,
              args,
            )
            if (result.status === 'error') {
              return finishTool(
                name,
                false,
                JSON.stringify({ ok: false, error: result.message }),
                args,
                result,
              )
            }
            const content =
              typeof result.content === 'string'
                ? result.content
                : JSON.stringify(result.content)
            return finishTool(name, true, content, args, result.content, {
              citations: undefined,
            })
          },
        })
        this.registered.push(name)
      }
    }
    this.connected = true
  }

  disconnect(): void {
    for (const name of this.registered) {
      toolRegistry.unregister(name)
    }
    this.registered = []
    this.bindings.clear()
    this.connected = false
  }

  async reconnect(): Promise<void> {
    this.disconnect()
    await this.connect()
  }

  listTools(): McpToolDescriptor[] {
    return [...this.bindings.entries()].map(([name, b]) => ({
      name,
      serverId: b.server.id,
      description: b.meta.description,
    }))
  }

  async invoke(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ ok: boolean; content: string }> {
    const parsed = parseMcpRegistryName(name)
    if (!parsed) {
      return {
        ok: false,
        content: JSON.stringify({ ok: false, error: 'Nome MCP inválido.' }),
      }
    }
    const binding = this.bindings.get(name)
    if (!binding) {
      return {
        ok: false,
        content: JSON.stringify({ ok: false, error: 'Ferramenta MCP não ligada.' }),
      }
    }
    const result = await invokeMcpTool(binding.server, binding.toolName, args)
    if (result.status === 'error') {
      return {
        ok: false,
        content: JSON.stringify({ ok: false, error: result.message }),
      }
    }
    return {
      ok: true,
      content:
        typeof result.content === 'string'
          ? result.content
          : JSON.stringify(result.content),
    }
  }
}

export const mcpToolProvider = new McpToolProvider()
