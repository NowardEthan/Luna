import { lunaPickFolder } from './lunaFileExplorerPrompt'
import { isLunaFileExplorerAvailable } from './lunaFileExplorer'

export function canPickPluginFromDisk(): boolean {
  return Boolean(
    isLunaFileExplorerAvailable() ||
      window.plugins?.installFromDirectory ||
      window.plugins?.pickAndInstall,
  )
}

export type PluginInstallPickResult =
  | { ok: false; canceled: true }
  | { ok: false; error: string }
  | {
      ok: true
      manifest: {
        id: string
        name: string
        version?: string
        description?: string
        entry?: string
        permissions?: string[]
        trusted?: boolean
        lunaApiVersion?: string
      }
      rootPath: string
      needsReload?: boolean
      installedAt: string
    }

/** Escolhe pasta do add-on (explorador Luna) e instala via IPC. */
export async function pickAndInstallPlugin(): Promise<PluginInstallPickResult> {
  if (isLunaFileExplorerAvailable() && window.plugins?.installFromDirectory) {
    const dir = await lunaPickFolder({
      title: 'Pasta do add-on',
      confirmLabel: 'Instalar desta pasta',
    })
    if (!dir) return { ok: false, canceled: true }
    return window.plugins.installFromDirectory(dir)
  }
  if (!window.plugins?.pickAndInstall) {
    return { ok: false, error: 'Instalação local indisponível neste ambiente.' }
  }
  return window.plugins.pickAndInstall()
}
