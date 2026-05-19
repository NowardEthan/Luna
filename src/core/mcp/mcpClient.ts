import type { McpServerConfig } from './storage'

export type McpToolMeta = {
  name: string
  description?: string
  parameters?: Record<string, unknown>
}

export type McpListResult =
  | { status: 'ok'; tools: McpToolMeta[] }
  | { status: 'error'; message: string }

export type McpInvokeResult =
  | { status: 'ok'; content: unknown }
  | { status: 'error'; message: string }

function baseUrl(server: McpServerConfig): string | null {
  const url = server.url?.trim().replace(/\/$/, '')
  if (!url || url.includes(':0')) return null
  return url
}

function normalizeTool(entry: unknown): McpToolMeta | null {
  if (typeof entry === 'string' && entry.trim()) {
    return { name: entry.trim() }
  }
  if (!entry || typeof entry !== 'object') return null
  const o = entry as Record<string, unknown>
  const name =
    typeof o.name === 'string'
      ? o.name
      : typeof o.id === 'string'
        ? o.id
        : ''
  if (!name.trim()) return null
  const description =
    typeof o.description === 'string'
      ? o.description
      : typeof o.summary === 'string'
        ? o.summary
        : undefined
  const parameters =
    (o.inputSchema as Record<string, unknown> | undefined) ??
    (o.parameters as Record<string, unknown> | undefined) ??
    (o.schema as Record<string, unknown> | undefined)
  return {
    name: name.trim(),
    description,
    ...(parameters && typeof parameters === 'object'
      ? { parameters }
      : {}),
  }
}

export async function listMcpTools(
  server: McpServerConfig,
): Promise<McpListResult> {
  const base = baseUrl(server)
  if (!base) return { status: 'error', message: 'URL não configurada.' }

  try {
    const res = await fetch(`${base}/tools`, {
      method: 'GET',
      signal: AbortSignal.timeout(6000),
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      return { status: 'error', message: `HTTP ${res.status} ao listar ferramentas` }
    }
    const data = (await res.json()) as {
      tools?: unknown[]
    }
    const tools = (data.tools ?? [])
      .map(normalizeTool)
      .filter((t): t is McpToolMeta => t != null)
    return {
      status: 'ok',
      tools: tools.length ? tools : [{ name: 'ping', description: 'Ping do servidor' }],
    }
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Sem ligação',
    }
  }
}

async function postJson(
  url: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
}

/** Invoca ferramenta MCP via convenções HTTP comuns de bridge. */
export async function invokeMcpTool(
  server: McpServerConfig,
  toolName: string,
  args: Record<string, unknown>,
): Promise<McpInvokeResult> {
  const base = baseUrl(server)
  if (!base) return { status: 'error', message: 'URL não configurada.' }

  if (toolName === 'ping') {
    const list = await listMcpTools(server)
    if (list.status === 'ok') {
      return {
        status: 'ok',
        content: { ok: true, tools: list.tools.map((t) => t.name) },
      }
    }
    return { status: 'error', message: list.message }
  }

  const attempts: { url: string; body: Record<string, unknown> }[] = [
    { url: `${base}/tools/${encodeURIComponent(toolName)}`, body: args },
    {
      url: `${base}/invoke`,
      body: { name: toolName, arguments: args },
    },
    {
      url: `${base}/tools/invoke`,
      body: { name: toolName, arguments: args },
    },
    {
      url: `${base}/call`,
      body: { tool: toolName, arguments: args },
    },
  ]

  let lastError = 'Nenhum endpoint de invocação respondeu.'
  for (const attempt of attempts) {
    try {
      const res = await postJson(attempt.url, attempt.body)
      const text = await res.text()
      if (!res.ok) {
        lastError = `HTTP ${res.status}: ${text.slice(0, 200)}`
        continue
      }
      try {
        return { status: 'ok', content: JSON.parse(text) as unknown }
      } catch {
        return { status: 'ok', content: text }
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Erro de rede'
    }
  }

  return { status: 'error', message: lastError }
}

export function parseMcpRegistryName(
  registryName: string,
): { serverId: string; toolName: string } | null {
  if (!registryName.startsWith('mcp__')) return null
  const rest = registryName.slice('mcp__'.length)
  const sep = rest.indexOf('__')
  if (sep <= 0) return null
  return {
    serverId: rest.slice(0, sep),
    toolName: rest.slice(sep + 2),
  }
}

export function mcpRegistryToolName(serverId: string, tool: string): string {
  return `mcp__${serverId}__${tool}`
}
