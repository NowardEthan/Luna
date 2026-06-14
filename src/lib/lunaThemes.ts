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
  '--color-success',
  '--color-success-muted',
  '--color-danger',
  '--color-danger-muted',
  '--color-warning',
  '--color-warning-muted',
  '--color-focus',
  '--color-composer-well',
] as const

/** Estados (sync, erros, avisos) — paleta escura. */
const LUNA_STATUS_DARK: Record<string, string> = {
  '--color-success': '#34d399',
  '--color-success-muted': '#1a2a22',
  '--color-danger': '#f87171',
  '--color-danger-muted': '#2a1c20',
  '--color-warning': '#fbbf24',
  '--color-warning-muted': '#2a2418',
}

/** Estados — paleta clara (fundos suaves, ícones mais escuros). */
const LUNA_STATUS_LIGHT: Record<string, string> = {
  '--color-success': '#047857',
  '--color-success-muted': '#d1fae5',
  '--color-danger': '#b91c1c',
  '--color-danger-muted': '#fee2e2',
  '--color-warning': '#b45309',
  '--color-warning-muted': '#fef3c7',
}

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

/** Valores por defeito — base cinza neutra (VS Code), acento violeta Luna. Espelham index.css. */
export const LUNA_DARK_CSS_VARS: Record<string, string> = {
  '--color-canvas': '#1e1e1e',
  '--color-sidebar': '#181818',
  '--color-surface': '#252525',
  '--color-raised': '#2d2d2d',
  '--color-raised-hover': '#383838',
  '--color-popover': '#252525',
  '--color-line': '#3c3c3c',
  '--color-line-subtle': '#2a2a2a',
  '--color-fg': '#d4d4d4',
  '--color-fg-dim': '#9d9d9d',
  '--color-fg-muted': '#6e6e6e',
  '--color-accent': '#8b7cf8',
  '--color-accent-muted': '#1c1829',
  '--color-accent-fg': '#ffffff',
  '--color-focus': '#8b7cf8',
  '--color-composer-well': '#141414',
  ...LUNA_STATUS_DARK,
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
  '--color-accent-muted': '#e5edf9',
  '--color-accent-fg': '#ffffff',
  '--color-focus': '#5b8fd4',
  '--color-composer-well': '#fafafa',
  ...LUNA_STATUS_LIGHT,
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
  '--color-accent-muted': '#1a2a3d',
  '--color-accent-fg': '#0d1117',
  '--color-focus': '#4a7ab0',
  '--color-composer-well': '#0a0d12',
  ...LUNA_STATUS_DARK,
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
  '--color-accent-muted': '#f5e8df',
  '--color-accent-fg': '#fff7ed',
  '--color-focus': '#c46a3a',
  '--color-composer-well': '#f7f2ea',
  ...LUNA_STATUS_LIGHT,
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
  '--color-accent-muted': '#1e2f26',
  '--color-accent-fg': '#0f1412',
  '--color-focus': '#3d8f5c',
  '--color-composer-well': '#0c0f0e',
  ...LUNA_STATUS_DARK,
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
  '--color-accent-muted': '#2a2438',
  '--color-accent-fg': '#1a1228',
  '--color-focus': '#7a62b8',
  '--color-composer-well': '#120f18',
  ...LUNA_STATUS_DARK,
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
  '--color-accent-muted': '#1a2a32',
  '--color-accent-fg': '#0a1218',
  '--color-focus': '#3a8a9a',
  '--color-composer-well': '#0b0f14',
  ...LUNA_STATUS_DARK,
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
  '--color-accent-muted': '#2a2a00',
  '--color-accent-fg': '#000000',
  '--color-focus': '#cccc00',
  '--color-composer-well': '#000000',
  '--color-success': '#00ff66',
  '--color-success-muted': '#0a1f14',
  '--color-danger': '#ff5555',
  '--color-danger-muted': '#1f0a0a',
  '--color-warning': '#ffcc00',
  '--color-warning-muted': '#1f1a0a',
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
  '--color-accent-muted': '#f8e8ec',
  '--color-accent-fg': '#fff1f2',
  '--color-focus': '#d44a6a',
  '--color-composer-well': '#fdf6f8',
  ...LUNA_STATUS_LIGHT,
}

export const LUNA_THEMES: Record<LunaThemeId, LunaThemeMeta> = {
  'luna-dark': {
    id: 'luna-dark',
    label: 'Noite Profunda',
    hint: 'Identidade visual da Luna — violeta índigo (predefinição)',
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
