/** Nome do arquivo para exibir ao usuário (caminho completo no `title`). */
export function fileBasename(fullPath: string): string {
  const normalized = fullPath.replace(/\\/g, '/')
  const i = normalized.lastIndexOf('/')
  return i >= 0 ? normalized.slice(i + 1) : fullPath
}
