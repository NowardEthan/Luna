export type McpServerConfig = {
  id: string
  name: string
  url: string
  enabled: boolean
}

const STORAGE_KEY = 'luna-mcp-servers'

export function readMcpServers(): McpServerConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as McpServerConfig[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeMcpServers(servers: McpServerConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(servers))
  } catch {
    /* ignore */
  }
}
