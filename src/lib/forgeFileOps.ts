import { joinPath } from './pathJoin'
import {
  bridgeAgentCreateDirectory,
  bridgeAgentDeletePath,
  bridgeAgentRenamePath,
  bridgeAgentWriteFile,
} from './lunaBridge'

export async function forgeCreateFile(parentDir: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false as const, error: 'Nome vazio.' }
  const path = joinPath(parentDir, trimmed)
  return bridgeAgentWriteFile(path, '')
}

export async function forgeCreateFolder(parentDir: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false as const, error: 'Nome vazio.' }
  const path = joinPath(parentDir, trimmed)
  return bridgeAgentCreateDirectory(path)
}

export async function forgeDeletePath(targetPath: string) {
  return bridgeAgentDeletePath(targetPath)
}

export async function forgeRenamePath(fromPath: string, toName: string) {
  const trimmed = toName.trim()
  if (!trimmed) return { ok: false as const, error: 'Nome vazio.' }
  const parent = fromPath.replace(/\\/g, '/').split('/').slice(0, -1).join('/')
  const toPath = joinPath(parent || '/', trimmed)
  return bridgeAgentRenamePath(fromPath, toPath)
}
