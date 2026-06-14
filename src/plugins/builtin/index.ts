import {
  registerLunaBuiltinThemes,
  themeRegistry,
} from '../../core/registry/ThemeRegistry'
import { readStoredThemeId } from '../../lib/lunaThemes'
import type { LunaPluginApi } from '../../../packages/luna-sdk/src'
import { activateBuiltinMemory } from './memory'
import { activateBuiltinRag } from './rag'
const BUILTIN_MANIFESTS = [
  { id: 'builtin-memory', activate: activateBuiltinMemory },
  { id: 'builtin-rag', activate: activateBuiltinRag },
] as const

/** Regista temas e activa plugins internos via API Luna. */
export function registerBuiltinPlugins(): void {
  registerLunaBuiltinThemes()
  themeRegistry.bootstrap(readStoredThemeId())

  const api: LunaPluginApi = {
    id: 'builtin',
    registerTool: () => {},
    registerPanel: () => {},
    registerCommand: () => {},
    registerSettings: () => {},
    registerShortcut: () => {},
    readSetting: (_key, fallback) => fallback as never,
    writeSetting: () => {},
    on: () => () => {},
    storage: {
      get: async () => null,
      set: async () => {},
    },
  }

  for (const entry of BUILTIN_MANIFESTS) {
    entry.activate({ ...api, id: entry.id })
  }
}
