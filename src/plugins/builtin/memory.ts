import type { LunaPluginApi } from '../../../packages/luna-sdk/src'

export const BUILTIN_MEMORY_PLUGIN_ID = 'builtin-memory'

export function activateBuiltinMemory(api: LunaPluginApi): void {
  void api
  /* Ferramentas registadas em registerBuiltinTools — plugin marca presença. */
}
