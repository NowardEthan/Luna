/** Junta segmentos de caminho preservando separador Windows ou POSIX. */
export function joinPath(base: string, ...parts: string[]): string {
  const sep = base.includes('\\') ? '\\' : '/'
  let out = base.replace(/[/\\]+$/, '')
  for (const part of parts) {
    const clean = part.replace(/^[/\\]+/, '').replace(/[/\\]+$/, '')
    if (!clean) continue
    out = `${out}${sep}${clean}`
  }
  return out
}
