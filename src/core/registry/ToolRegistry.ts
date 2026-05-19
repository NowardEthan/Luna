import type { RegisteredTool, ToolUiMeta } from './types'

class ToolRegistryImpl {
  private readonly tools = new Map<string, RegisteredTool>()

  register(tool: RegisteredTool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`[Luna] Ferramenta duplicada ignorada: ${tool.name}`)
      return
    }
    this.tools.set(tool.name, tool)
  }

  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name)
  }

  has(name: string): boolean {
    return this.tools.has(name)
  }

  getSchemas(): unknown[] {
    return [...this.tools.values()].map((t) => t.schema)
  }

  getUiLabels(): Record<string, string> {
    const out: Record<string, string> = {}
    for (const t of this.tools.values()) {
      if (t.uiLabel) out[t.name] = t.uiLabel
    }
    return out
  }

  getUiMeta(): Record<string, ToolUiMeta> {
    const out: Record<string, ToolUiMeta> = {}
    for (const t of this.tools.values()) {
      if (t.uiMeta) out[t.name] = t.uiMeta
    }
    return out
  }

  listNames(): string[] {
    return [...this.tools.keys()]
  }

  unregister(name: string): void {
    this.tools.delete(name)
  }

  unregisterByPrefix(prefix: string): void {
    for (const name of [...this.tools.keys()]) {
      if (name.startsWith(prefix)) this.tools.delete(name)
    }
  }

  clear(): void {
    this.tools.clear()
  }
}

export const toolRegistry = new ToolRegistryImpl()
