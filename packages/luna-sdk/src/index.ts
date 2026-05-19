import type { ReactNode } from 'react'

export type LunaPermission =
  | 'tools'
  | 'panels'
  | 'commands'
  | 'hooks'
  | 'themes'
  | 'storage'
  | 'settings'

export type PluginSettingFieldType = 'string' | 'boolean' | 'number' | 'select'

export type PluginSettingField = {
  key: string
  type: PluginSettingFieldType
  label: string
  description?: string
  default?: string | boolean | number
  options?: { value: string; label: string }[]
}

export type PluginSettingsSchema = {
  fields: PluginSettingField[]
}

export const LUNA_API_VERSION = '1'

export type PluginManifest = {
  id: string
  name: string
  version: string
  description?: string
  entry?: string
  permissions?: LunaPermission[]
  /** Se true, corre no thread principal (dev / extensões de confiança). */
  trusted?: boolean
  lunaApiVersion?: string
  /** Propriedades editáveis em Definições → Add-ons (mesmo com add-on desactivado). */
  settings?: PluginSettingsSchema
}

export type PluginSettingsPanel = {
  title?: string
  render: () => ReactNode
}

export type PluginShortcutSpec = {
  id: string
  label: string
  keys: string
  run: () => void
}

export type LunaPluginApi = {
  id: string
  registerTool: (tool: unknown) => void
  registerPanel: (panel: unknown) => void
  registerCommand: (command: unknown) => void
  on: (event: string, handler: (payload: unknown) => void) => () => void
  storage: {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: string) => Promise<void>
  }
  /** Painel personalizado em Definições → Add-ons (requer permissão `settings`). */
  registerSettings: (panel: PluginSettingsPanel) => void
  /** Atalho global enquanto o add-on está activo. */
  registerShortcut: (shortcut: PluginShortcutSpec) => void
  readSetting: <T = unknown>(key: string, fallback?: T) => T
  writeSetting: (key: string, value: unknown) => void
}

export type LunaPluginModule = {
  activate?: (api: LunaPluginApi) => void | Promise<void>
  deactivate?: () => void | Promise<void>
}
