const PREFIX = 'luna-panel-'

export type PanelLayoutStored = {
  /** Fração do painel inicial (0–1), preferida para redimensionar a janela. */
  ratio?: number
  /** Largura/altura em px (legado ou fallback). */
  px?: number
}

export function readPanelLayout(key: string): PanelLayoutStored | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`)
    if (!raw) return null
    if (raw.startsWith('{')) {
      const parsed = JSON.parse(raw) as PanelLayoutStored
      if (!parsed || typeof parsed !== 'object') return null
      const out: PanelLayoutStored = {}
      if (
        typeof parsed.ratio === 'number' &&
        Number.isFinite(parsed.ratio) &&
        parsed.ratio > 0 &&
        parsed.ratio < 1
      ) {
        out.ratio = parsed.ratio
      }
      if (
        typeof parsed.px === 'number' &&
        Number.isFinite(parsed.px) &&
        parsed.px > 0
      ) {
        out.px = parsed.px
      }
      return Object.keys(out).length ? out : null
    }
    const n = Number(raw)
    if (Number.isFinite(n) && n > 0) return { px: n }
    return null
  } catch {
    return null
  }
}

export function writePanelLayout(key: string, data: PanelLayoutStored): void {
  try {
    const payload: PanelLayoutStored = {}
    if (
      typeof data.ratio === 'number' &&
      Number.isFinite(data.ratio) &&
      data.ratio > 0 &&
      data.ratio < 1
    ) {
      payload.ratio = data.ratio
    }
    if (
      typeof data.px === 'number' &&
      Number.isFinite(data.px) &&
      data.px > 0
    ) {
      payload.px = Math.round(data.px)
    }
    if (!Object.keys(payload).length) return
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

/** @deprecated Preferir readPanelLayout — mantido para compatibilidade. */
export function readPanelSize(key: string, fallback: number): number {
  const layout = readPanelLayout(key)
  if (layout?.px != null && layout.px > 0) return layout.px
  return fallback
}

/** @deprecated Preferir writePanelLayout — mantido para compatibilidade. */
export function writePanelSize(key: string, size: number): void {
  writePanelLayout(key, { px: size })
}
