/** Limites do contexto IDE injectado no system (ajustáveis via localStorage). */

const DEFAULTS = {
  totalMaxChars: 18_000,
  activeFileMaxChars: 12_000,
  dirtyTabMaxChars: 6_000,
  mentionFileMaxChars: 10_000,
  terminalTailLines: 40,
  gitDiffMaxChars: 6_000,
  ragChunksMaxChars: 4_500,
  patchPreviewLines: 12,
} as const

function readInt(key: string, fallback: number): number {
  try {
    const v = globalThis.localStorage?.getItem(key)
    if (!v) return fallback
    const n = Number.parseInt(v, 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
  } catch {
    return fallback
  }
}

export function ideContextLimits() {
  return {
    totalMaxChars: readInt('luna-ide-context-max-chars', DEFAULTS.totalMaxChars),
    activeFileMaxChars: readInt(
      'luna-ide-active-file-max-chars',
      DEFAULTS.activeFileMaxChars,
    ),
    dirtyTabMaxChars: readInt(
      'luna-ide-dirty-tab-max-chars',
      DEFAULTS.dirtyTabMaxChars,
    ),
    mentionFileMaxChars: readInt(
      'luna-ide-mention-file-max-chars',
      DEFAULTS.mentionFileMaxChars,
    ),
    terminalTailLines: readInt(
      'luna-ide-terminal-tail-lines',
      DEFAULTS.terminalTailLines,
    ),
    gitDiffMaxChars: readInt('luna-ide-git-diff-max-chars', DEFAULTS.gitDiffMaxChars),
    ragChunksMaxChars: readInt(
      'luna-ide-rag-chunks-max-chars',
      DEFAULTS.ragChunksMaxChars,
    ),
    patchPreviewLines: DEFAULTS.patchPreviewLines,
  }
}

export function readIdeAutoApply(): boolean {
  try {
    return globalThis.localStorage?.getItem('luna-ide-auto-apply') === '1'
  } catch {
    return false
  }
}

export function writeIdeAutoApply(value: boolean): void {
  try {
    globalThis.localStorage?.setItem('luna-ide-auto-apply', value ? '1' : '0')
  } catch {
    /* ignore */
  }
}
