/** Variáveis CSS do tema — alinhadas com `@theme` em index.css. */
export const LUNA_THEME_CSS_KEYS = [
  '--color-canvas',
  '--color-sidebar',
  '--color-surface',
  '--color-raised',
  '--color-raised-hover',
  '--color-popover',
  '--color-line',
  '--color-line-subtle',
  '--color-fg',
  '--color-fg-dim',
  '--color-fg-muted',
  '--color-accent',
  '--color-accent-muted',
  '--color-accent-fg',
  '--color-focus',
  '--color-composer-well',
] as const

export type LunaThemeId =
  | 'luna-dark'
  | 'luna-light'
  | 'luna-midnight'
  | 'luna-solar'
  | 'luna-forest'
  | 'luna-dusk'
  | 'luna-ocean'
  | 'luna-rose'
  | 'luna-contrast'

export const LUNA_THEME_STORAGE_KEY = 'luna-theme-id'

export const DEFAULT_LUNA_THEME_ID: LunaThemeId = 'luna-dark'

export type LunaThemeMeta = {
  id: LunaThemeId
  label: string
  hint: string
  colorScheme: 'light' | 'dark'
  cssVars: Record<string, string>
}

/** Valores por defeito (escuro) — espelham index.css. */
export const LUNA_DARK_CSS_VARS: Record<string, string> = {
  '--color-canvas': '#161618',
  '--color-sidebar': '#121214',
  '--color-surface': '#1e1e22',
  '--color-raised': '#26262c',
  '--color-raised-hover': '#303038',
  '--color-popover': '#232328',
  '--color-line': '#34343a',
  '--color-line-subtle': '#2a2a30',
  '--color-fg': '#ececef',
  '--color-fg-dim': '#a8a8b3',
  '--color-fg-muted': '#6f6f7a',
  '--color-accent': '#5eb3f6',
  '--color-accent-muted': 'rgba(94, 179, 246, 0.16)',
  '--color-accent-fg': '#0f1419',
  '--color-focus': 'rgba(94, 179, 246, 0.42)',
  '--color-composer-well': '#0e0e10',
}

export const LUNA_LIGHT_CSS_VARS: Record<string, string> = {
  '--color-canvas': '#f4f4f6',
  '--color-sidebar': '#ebebed',
  '--color-surface': '#ffffff',
  '--color-raised': '#f0f0f3',
  '--color-raised-hover': '#e4e4ea',
  '--color-popover': '#ffffff',
  '--color-line': '#d4d4dc',
  '--color-line-subtle': '#e8e8ee',
  '--color-fg': '#1a1a1f',
  '--color-fg-dim': '#4a4a56',
  '--color-fg-muted': '#737380',
  '--color-accent': '#2563eb',
  '--color-accent-muted': 'rgba(37, 99, 235, 0.12)',
  '--color-accent-fg': '#ffffff',
  '--color-focus': 'rgba(37, 99, 235, 0.35)',
  '--color-composer-well': '#fafafa',
}

const LUNA_MIDNIGHT_CSS_VARS: Record<string, string> = {
  '--color-canvas': '#0d1117',
  '--color-sidebar': '#010409',
  '--color-surface': '#161b22',
  '--color-raised': '#1c2128',
  '--color-raised-hover': '#262c36',
  '--color-popover': '#1a1f27',
  '--color-line': '#30363d',
  '--color-line-subtle': '#21262d',
  '--color-fg': '#e6edf3',
  '--color-fg-dim': '#9ba7b4',
  '--color-fg-muted': '#6e7681',
  '--color-accent': '#58a6ff',
  '--color-accent-muted': 'rgba(88, 166, 255, 0.18)',
  '--color-accent-fg': '#0d1117',
  '--color-focus': 'rgba(88, 166, 255, 0.4)',
  '--color-composer-well': '#0a0d12',
}

const LUNA_SOLAR_CSS_VARS: Record<string, string> = {
  '--color-canvas': '#faf6ef',
  '--color-sidebar': '#f3ebe0',
  '--color-surface': '#fffefb',
  '--color-raised': '#f5efe6',
  '--color-raised-hover': '#ebe3d6',
  '--color-popover': '#fffefb',
  '--color-line': '#ddd2c4',
  '--color-line-subtle': '#ebe4d9',
  '--color-fg': '#2c2419',
  '--color-fg-dim': '#5c5042',
  '--color-fg-muted': '#8a7d6e',
  '--color-accent': '#c2410c',
  '--color-accent-muted': 'rgba(194, 65, 12, 0.12)',
  '--color-accent-fg': '#fff7ed',
  '--color-focus': 'rgba(194, 65, 12, 0.32)',
  '--color-composer-well': '#f7f2ea',
}

const LUNA_FOREST_CSS_VARS: Record<string, string> = {
  '--color-canvas': '#131816',
  '--color-sidebar': '#0e110f',
  '--color-surface': '#1a211e',
  '--color-raised': '#222a26',
  '--color-raised-hover': '#2c3631',
  '--color-popover': '#1e2622',
  '--color-line': '#2f3b36',
  '--color-line-subtle': '#232c28',
  '--color-fg': '#e2ebe6',
  '--color-fg-dim': '#9dada4',
  '--color-fg-muted': '#6d8178',
  '--color-accent': '#4ade80',
  '--color-accent-muted': 'rgba(74, 222, 128, 0.14)',
  '--color-accent-fg': '#0f1412',
  '--color-focus': 'rgba(74, 222, 128, 0.38)',
  '--color-composer-well': '#0c0f0e',
}

const LUNA_DUSK_CSS_VARS: Record<string, string> = {
  '--color-canvas': '#17141f',
  '--color-sidebar': '#110e17',
  '--color-surface': '#211c2c',
  '--color-raised': '#2a2436',
  '--color-raised-hover': '#352e44',
  '--color-popover': '#241f30',
  '--color-line': '#3d3549',
  '--color-line-subtle': '#2c2638',
  '--color-fg': '#ede8f4',
  '--color-fg-dim': '#b5a9c8',
  '--color-fg-muted': '#7f7394',
  '--color-accent': '#a78bfa',
  '--color-accent-muted': 'rgba(167, 139, 250, 0.16)',
  '--color-accent-fg': '#1a1228',
  '--color-focus': 'rgba(167, 139, 250, 0.4)',
  '--color-composer-well': '#120f18',
}

const LUNA_OCEAN_CSS_VARS: Record<string, string> = {
  '--color-canvas': '#0f1419',
  '--color-sidebar': '#0a0e12',
  '--color-surface': '#151d24',
  '--color-raised': '#1c2730',
  '--color-raised-hover': '#253340',
  '--color-popover': '#182028',
  '--color-line': '#2a3a47',
  '--color-line-subtle': '#1e2a34',
  '--color-fg': '#e4eef4',
  '--color-fg-dim': '#94aab8',
  '--color-fg-muted': '#647d8c',
  '--color-accent': '#22d3ee',
  '--color-accent-muted': 'rgba(34, 211, 238, 0.14)',
  '--color-accent-fg': '#0a1218',
  '--color-focus': 'rgba(34, 211, 238, 0.38)',
  '--color-composer-well': '#0b0f14',
}

const LUNA_CONTRAST_CSS_VARS: Record<string, string> = {
  '--color-canvas': '#000000',
  '--color-sidebar': '#000000',
  '--color-surface': '#0a0a0a',
  '--color-raised': '#141414',
  '--color-raised-hover': '#1f1f1f',
  '--color-popover': '#0a0a0a',
  '--color-line': '#ffffff',
  '--color-line-subtle': '#666666',
  '--color-fg': '#ffffff',
  '--color-fg-dim': '#e0e0e0',
  '--color-fg-muted': '#b0b0b0',
  '--color-accent': '#ffff00',
  '--color-accent-muted': 'rgba(255, 255, 0, 0.2)',
  '--color-accent-fg': '#000000',
  '--color-focus': 'rgba(255, 255, 0, 0.55)',
  '--color-composer-well': '#000000',
}

const LUNA_ROSE_CSS_VARS: Record<string, string> = {
  '--color-canvas': '#faf5f7',
  '--color-sidebar': '#f5e8ec',
  '--color-surface': '#fffbfc',
  '--color-raised': '#f8eef1',
  '--color-raised-hover': '#efe2e7',
  '--color-popover': '#fffbfc',
  '--color-line': '#e8d4da',
  '--color-line-subtle': '#f0e4e8',
  '--color-fg': '#2a1a20',
  '--color-fg-dim': '#6b4f58',
  '--color-fg-muted': '#947a84',
  '--color-accent': '#e11d48',
  '--color-accent-muted': 'rgba(225, 29, 72, 0.1)',
  '--color-accent-fg': '#fff1f2',
  '--color-focus': 'rgba(225, 29, 72, 0.3)',
  '--color-composer-well': '#fdf6f8',
}

export const LUNA_THEMES: Record<LunaThemeId, LunaThemeMeta> = {
  'luna-dark': {
    id: 'luna-dark',
    label: 'Escuro',
    hint: 'Workbench escuro (predefinição)',
    colorScheme: 'dark',
    cssVars: LUNA_DARK_CSS_VARS,
  },
  'luna-light': {
    id: 'luna-light',
    label: 'Claro',
    hint: 'Interface clara neutra',
    colorScheme: 'light',
    cssVars: LUNA_LIGHT_CSS_VARS,
  },
  'luna-midnight': {
    id: 'luna-midnight',
    label: 'Meia-noite',
    hint: 'Azul profundo, estilo editor',
    colorScheme: 'dark',
    cssVars: LUNA_MIDNIGHT_CSS_VARS,
  },
  'luna-solar': {
    id: 'luna-solar',
    label: 'Solar',
    hint: 'Creme quente, confortável de dia',
    colorScheme: 'light',
    cssVars: LUNA_SOLAR_CSS_VARS,
  },
  'luna-forest': {
    id: 'luna-forest',
    label: 'Floresta',
    hint: 'Verde suave, menos cansaço visual',
    colorScheme: 'dark',
    cssVars: LUNA_FOREST_CSS_VARS,
  },
  'luna-dusk': {
    id: 'luna-dusk',
    label: 'Crepúsculo',
    hint: 'Roxo/violeta para sessões nocturnas',
    colorScheme: 'dark',
    cssVars: LUNA_DUSK_CSS_VARS,
  },
  'luna-ocean': {
    id: 'luna-ocean',
    label: 'Oceano',
    hint: 'Azul-petróleo com destaque ciano',
    colorScheme: 'dark',
    cssVars: LUNA_OCEAN_CSS_VARS,
  },
  'luna-rose': {
    id: 'luna-rose',
    label: 'Rosa',
    hint: 'Claro rosado, acentos quentes',
    colorScheme: 'light',
    cssVars: LUNA_ROSE_CSS_VARS,
  },
  'luna-contrast': {
    id: 'luna-contrast',
    label: 'Alto contraste',
    hint: 'Preto e branco — máxima legibilidade',
    colorScheme: 'dark',
    cssVars: LUNA_CONTRAST_CSS_VARS,
  },
}

/** Próximo tema na lista (atalho). */
export function cycleLunaTheme(current: LunaThemeId): LunaThemeId {
  const ids = LUNA_THEME_LIST.map((t) => t.id)
  const index = ids.indexOf(current)
  const next = index < 0 ? 0 : (index + 1) % ids.length
  return ids[next] ?? DEFAULT_LUNA_THEME_ID
}


export const LUNA_THEME_LIST: LunaThemeMeta[] = Object.values(LUNA_THEMES)

const THEME_IDS = new Set<string>(Object.keys(LUNA_THEMES))

export function isLunaThemeId(id: string): id is LunaThemeId {
  return THEME_IDS.has(id)
}

export function readStoredThemeId(): LunaThemeId {
  try {
    const id = globalThis.localStorage?.getItem(LUNA_THEME_STORAGE_KEY)
    if (id && isLunaThemeId(id)) return id
  } catch {
    /* ignore */
  }
  return DEFAULT_LUNA_THEME_ID
}

export function writeStoredThemeId(id: LunaThemeId): void {
  try {
    globalThis.localStorage?.setItem(LUNA_THEME_STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}

export function getThemeMeta(id: LunaThemeId): LunaThemeMeta {
  return LUNA_THEMES[id]
}

export function cssVarsForTheme(id: LunaThemeId): Record<string, string> {
  return LUNA_THEMES[id].cssVars
}

export function applyColorScheme(id: LunaThemeId): void {
  if (typeof document === 'undefined') return
  document.documentElement.style.colorScheme = LUNA_THEMES[id].colorScheme
}

export function isLunaLightTheme(): boolean {
  if (typeof document === 'undefined') {
    return LUNA_THEMES[DEFAULT_LUNA_THEME_ID].colorScheme === 'light'
  }
  const attr = document.documentElement.getAttribute('data-luna-theme')
  const id = attr && isLunaThemeId(attr) ? attr : DEFAULT_LUNA_THEME_ID
  return LUNA_THEMES[id].colorScheme === 'light'
}

export function isLunaDarkTheme(): boolean {
  return !isLunaLightTheme()
}
