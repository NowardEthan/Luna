import { findWorkspaceRootForPath } from './workspaceConfig'
import { joinPath } from './pathJoin'

/**
 * Converte caminhos do agente (ex. `/test/foo.py`, `test/foo.py`) para o caminho
 * absoluto dentro da raiz do workspace.
 */
export function resolveWorkspaceFilePath(
  filePath: string,
  workspaceRoot: string | null,
  workspaceFolders?: string[] | null,
): string {
  const trimmed = filePath.trim()
  if (!trimmed) return trimmed

  const folders =
    workspaceFolders?.filter((f) => f?.trim()) ??
    (workspaceRoot ? [workspaceRoot] : [])
  if (!folders.length) return trimmed

  const matched = findWorkspaceRootForPath(trimmed, folders)
  const root = (matched ?? workspaceRoot ?? folders[0]!).replace(/[/\\]+$/, '')
  const sep = root.includes('\\') ? '\\' : '/'
  const norm = (p: string) => p.replace(/\//g, sep)

  if (/^[A-Za-z]:[\\/]/.test(trimmed)) {
    return norm(trimmed)
  }

  const asNorm = norm(trimmed)
  const rootLower = root.toLowerCase()
  const pathLower = asNorm.toLowerCase()
  if (
    pathLower === rootLower ||
    pathLower.startsWith(`${rootLower}${sep}`)
  ) {
    return asNorm
  }

  const rel = trimmed.replace(/^[/\\]+/, '')
  return joinPath(root, rel)
}
