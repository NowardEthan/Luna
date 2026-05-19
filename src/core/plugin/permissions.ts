import type { LunaPermission, PluginManifest } from '../../../packages/luna-sdk/src'

export type PluginAction =
  | 'registerTool'
  | 'registerPanel'
  | 'registerCommand'
  | 'registerSettings'
  | 'registerShortcut'
  | 'on'
  | 'storage'

const ACTION_PERMISSION: Record<PluginAction, LunaPermission> = {
  registerTool: 'tools',
  registerPanel: 'panels',
  registerCommand: 'commands',
  registerSettings: 'settings',
  registerShortcut: 'commands',
  on: 'hooks',
  storage: 'storage',
}

export function assertPluginPermission(
  manifest: PluginManifest,
  action: PluginAction,
): void {
  const perms = new Set(manifest.permissions ?? [])
  const required = ACTION_PERMISSION[action]
  if (!perms.has(required)) {
    throw new Error(
      `Plugin «${manifest.id}» não tem permissão «${required}» para ${action}.`,
    )
  }
}

export function canUseWorker(manifest: PluginManifest): boolean {
  if (manifest.trusted === true) return false
  return true
}
