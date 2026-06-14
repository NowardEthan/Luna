import { bridgeAgentRunCommand } from './lunaBridge'

const PRETTIER_LANGS = new Set([
  'javascript',
  'typescript',
  'json',
  'css',
  'html',
  'markdown',
  'yaml',
])

function shellQuote(path: string): string {
  return `"${path.replace(/"/g, '\\"')}"`
}

export function canFormatLanguage(languageId: string): boolean {
  return PRETTIER_LANGS.has(languageId)
}

export async function runFormatOnDisk(
  filePath: string,
  languageId: string,
  workspaceRoot: string | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!canFormatLanguage(languageId)) {
    return { ok: false, error: 'Formatador não disponível para este tipo de ficheiro.' }
  }
  const quoted = shellQuote(filePath)
  const r = await bridgeAgentRunCommand(
    `npx prettier --write ${quoted}`,
    workspaceRoot ?? undefined,
  )
  if (!r.ok) {
    return { ok: false, error: r.error ?? 'Prettier falhou.' }
  }
  if (r.exit_code !== 0 && r.exit_code != null) {
    const msg = [r.stderr, r.stdout].filter(Boolean).join('\n').trim()
    return { ok: false, error: msg || `Prettier exit ${r.exit_code}` }
  }
  return { ok: true }
}
