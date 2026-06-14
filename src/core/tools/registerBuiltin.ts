import { toolRegistry } from '../registry/ToolRegistry'
import { conversationTools } from './handlers/conversation'
import { filesystemTools } from './handlers/filesystem'
import { memoryTools } from './handlers/memory'
import { ragTools } from './handlers/rag'
import { lunaFinancesTools } from '../../features/finances/financesLunaTools'

let registered = false

/** Chave canónica — se já existir, built-ins foram registados (ex. HMR). */
const BUILTIN_MARKER = 'save_memory'

/** Garante tools built-in — chamar só no boot ([`AppProviders`](../shell/AppProviders.tsx)). */
export function registerBuiltinTools(): void {
  if (registered) return
  if (toolRegistry.has(BUILTIN_MARKER)) {
    registered = true
    return
  }
  registered = true
  const all = [
    ...memoryTools,
    ...ragTools,
    ...conversationTools,
    ...filesystemTools,
    ...lunaFinancesTools,
  ]
  for (const tool of all) {
    if (!toolRegistry.has(tool.name)) {
      toolRegistry.register(tool)
    }
  }
}

export function resetBuiltinToolsForTests(): void {
  registered = false
  toolRegistry.clear()
}

/** Usado por agente/UI — não regista; falha em dev se o boot não correu. */
export function assertBuiltinToolsRegistered(): void {
  if (toolRegistry.has(BUILTIN_MARKER)) return
  if (import.meta.env.DEV) {
    console.error(
      '[Luna] ToolRegistry vazio — registerBuiltinTools() deve correr em AppProviders antes de usar ferramentas.',
    )
  }
}
