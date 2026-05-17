import { bridgeAgentReadFile } from './lunaBridge'
import { getIdeTurnHost } from './ideTurnHost'

export type FileContentSource = 'editor' | 'disk' | 'missing'

export type ResolvedFileContent = {
  ok: boolean
  content: string
  source: FileContentSource
  dirty: boolean
  path: string
}

/** Buffer do editor (dirty) tem prioridade sobre disco. */
export async function resolveFileContent(
  filePath: string,
  maxChars?: number,
): Promise<ResolvedFileContent> {
  const path = filePath.trim()
  const host = getIdeTurnHost()
  if (host) {
    const r = await host.readFileFromWorkspace(path, maxChars)
    if (r.ok && r.content !== undefined) {
      return {
        ok: true,
        content: r.content,
        source: r.source ?? 'disk',
        dirty: r.source === 'editor',
        path,
      }
    }
    if (r.source === 'missing') {
      return { ok: true, content: '', source: 'missing', dirty: false, path }
    }
  }
  const disk = await bridgeAgentReadFile(path, maxChars)
  if (disk.ok && disk.content !== undefined) {
    return {
      ok: true,
      content: disk.content,
      source: 'disk',
      dirty: false,
      path,
    }
  }
  return { ok: false, content: '', source: 'missing', dirty: false, path }
}
