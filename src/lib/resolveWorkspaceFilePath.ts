import { joinPath } from './pathJoin'

/**
 * Converte caminhos do agente (ex. `/test/foo.py`, `test/foo.py`) para o caminho
 * absoluto dentro da raiz do workspace.
 */
export function resolveWorkspaceFilePath(
  filePath: string,
  workspaceRoot: string | null,
): string {
  const trimmed = filePath.trim()
  if (!trimmed || !workspaceRoot) return trimmed

  const root = workspaceRoot.replace(/[/\\]+$/, '')
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
