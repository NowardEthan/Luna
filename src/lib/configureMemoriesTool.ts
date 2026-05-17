import { isMemoryKindId } from './memoryKinds'
import type { MemoryUiPrefs } from '../types/memory'

const MAX_PANEL_HINT = 280

export function applyConfigureMemories(
  current: MemoryUiPrefs | undefined,
  argsJson: string,
): { ui: MemoryUiPrefs; toolPayload: Record<string, unknown> } {
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(argsJson) as Record<string, unknown>
  } catch {
    return {
      ui: current ?? {},
      toolPayload: { ok: false, error: 'JSON inválido.' },
    }
  }

  const next: MemoryUiPrefs = { ...(current ?? {}) }

  if (parsed.panel_hint !== undefined) {
    if (parsed.panel_hint === null || parsed.panel_hint === '') {
      delete next.panelHint
    } else if (typeof parsed.panel_hint === 'string') {
      const hint = parsed.panel_hint.replace(/\s+/g, ' ').trim()
      if (hint.length) next.panelHint = hint.slice(0, MAX_PANEL_HINT)
    }
  }

  if (parsed.emphasize_kind !== undefined) {
    if (parsed.emphasize_kind === null || parsed.emphasize_kind === '') {
      delete next.emphasizeKind
    } else if (isMemoryKindId(parsed.emphasize_kind)) {
      next.emphasizeKind = parsed.emphasize_kind
    }
  }

  if (parsed.clear_emphasis === true) {
    delete next.emphasizeKind
  }

  return {
    ui: next,
    toolPayload: {
      ok: true,
      panel_hint: next.panelHint ?? null,
      emphasize_kind: next.emphasizeKind ?? null,
    },
  }
}

export function formatMemoryUiForModel(ui: MemoryUiPrefs | undefined): string {
  if (!ui?.panelHint && !ui?.emphasizeKind) return ''
  const lines: string[] = ['Preferências do painel Memórias (configuráveis por ti):']
  if (ui.panelHint) lines.push(`- Mensagem no painel: ${ui.panelHint}`)
  if (ui.emphasizeKind) {
    lines.push(`- Secção em destaque: ${ui.emphasizeKind}`)
  }
  return lines.join('\n')
}

export function sanitizeMemoryUi(raw: unknown): MemoryUiPrefs | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const out: MemoryUiPrefs = {}
  if (typeof o.panelHint === 'string') {
    const h = o.panelHint.replace(/\s+/g, ' ').trim().slice(0, MAX_PANEL_HINT)
    if (h.length) out.panelHint = h
  }
  if (isMemoryKindId(o.emphasizeKind)) {
    out.emphasizeKind = o.emphasizeKind
  }
  return Object.keys(out).length ? out : undefined
}
