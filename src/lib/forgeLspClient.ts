import {
  setFileDiagnostics,
  type ForgeDiagnostic,
} from './forgeDiagnosticsStore'

const LSP_LANG_IDS = new Set([
  'typescript',
  'javascript',
  'typescriptreact',
  'javascriptreact',
  'json',
])

const docVersions = new Map<string, number>()
let listenerInstalled = false

export function isForgeLspLanguage(languageId: string): boolean {
  return LSP_LANG_IDS.has(languageId.toLowerCase())
}

function mapSeverity(
  value: number | undefined,
): ForgeDiagnostic['severity'] {
  if (value === 1) return 'error'
  if (value === 2) return 'warning'
  return 'info'
}

function mapLspDiagnostics(
  path: string,
  raw: unknown[],
): ForgeDiagnostic[] {
  const out: ForgeDiagnostic[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const d = item as {
      message?: string
      severity?: number
      range?: { start?: { line?: number; character?: number } }
    }
    const msg = String(d.message ?? '').trim()
    if (!msg) continue
    const line = (d.range?.start?.line ?? 0) + 1
    const column = (d.range?.start?.character ?? 0) + 1
    out.push({
      path,
      line,
      column,
      message: msg,
      severity: mapSeverity(d.severity),
    })
  }
  return out
}

export function ensureForgeLspListener(): void {
  if (listenerInstalled || !window.forgeLsp?.onDiagnostics) return
  listenerInstalled = true
  window.forgeLsp.onDiagnostics(({ path, diagnostics }) => {
    if (!path) return
    const items = Array.isArray(diagnostics)
      ? mapLspDiagnostics(path, diagnostics)
      : []
    setFileDiagnostics(path, items)
  })
}

export async function syncForgeLspWorkspace(
  workspaceRoot: string | null,
): Promise<void> {
  if (!window.forgeLsp?.setWorkspaceRoot) return
  ensureForgeLspListener()
  await window.forgeLsp.setWorkspaceRoot(workspaceRoot)
  if (!workspaceRoot) docVersions.clear()
}

export async function forgeLspOpenDocument(
  path: string,
  languageId: string,
  text: string,
): Promise<void> {
  if (!window.forgeLsp?.openDocument || !isForgeLspLanguage(languageId)) return
  ensureForgeLspListener()
  const version = (docVersions.get(path) ?? 0) + 1
  docVersions.set(path, version)
  await window.forgeLsp.openDocument({ path, languageId, text, version })
}

export async function forgeLspChangeDocument(
  path: string,
  text: string,
): Promise<void> {
  if (!window.forgeLsp?.changeDocument) return
  const version = (docVersions.get(path) ?? 0) + 1
  docVersions.set(path, version)
  await window.forgeLsp.changeDocument({ path, text, version })
}

export async function forgeLspCloseDocument(path: string): Promise<void> {
  if (!window.forgeLsp?.closeDocument) return
  docVersions.delete(path)
  await window.forgeLsp.closeDocument(path)
}

export async function forgeLspCompletion(
  path: string,
  line: number,
  character: number,
): Promise<unknown> {
  if (!window.forgeLsp?.completion) return null
  const r = await window.forgeLsp.completion({ path, line, character })
  return r.ok ? r.result : null
}

export async function forgeLspHover(
  path: string,
  line: number,
  character: number,
): Promise<unknown> {
  if (!window.forgeLsp?.hover) return null
  const r = await window.forgeLsp.hover({ path, line, character })
  return r.ok ? r.result : null
}

export async function forgeLspDefinition(
  path: string,
  line: number,
  character: number,
): Promise<unknown> {
  if (!window.forgeLsp?.definition) return null
  const r = await window.forgeLsp.definition({ path, line, character })
  return r.ok ? r.result : null
}
