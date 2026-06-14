import { ideTools } from '../../core/tools/handlers/ide'
import { toolRegistry } from '../../core/registry/ToolRegistry'

const IDE_TOOL_NAMES = ideTools.map((t) => t.name)

export function registerLunaIdeTools(): void {
  for (const tool of ideTools) {
    if (!toolRegistry.has(tool.name)) {
      toolRegistry.register(tool)
    }
  }
}

export function unregisterLunaIdeTools(): void {
  for (const name of IDE_TOOL_NAMES) {
    toolRegistry.unregister(name)
  }
}
