/**
 * Linguagem visual Luna — flat, sólido, cores vibrantes (inspirado no painel Finanças / Win11).
 * Preferir classes CSS `luna-*` em index.css; usar helpers aqui quando Tailwind dinâmico for necessário.
 */

export type LunaVividTone =
  | 'default'
  | 'blue'
  | 'green'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'cyan'

/** Alias alinhado com FolderColorId. */
export type LunaAccentTone = LunaVividTone

const VIVID_SHELL: Record<LunaVividTone, string> = {
  default:
    'border border-line-subtle bg-surface text-fg hover:bg-raised-hover',
  blue: 'border border-sky-600/35 bg-sky-500 text-white hover:bg-sky-400',
  green: 'border border-emerald-600/35 bg-emerald-500 text-white hover:bg-emerald-400',
  amber: 'border border-amber-600/35 bg-amber-500 text-white hover:bg-amber-400',
  rose: 'border border-rose-600/35 bg-rose-500 text-white hover:bg-rose-400',
  violet: 'border border-violet-600/35 bg-violet-500 text-white hover:bg-violet-400',
  cyan: 'border border-cyan-600/35 bg-cyan-500 text-white hover:bg-cyan-400',
}

const VIVID_SHELL_ACTIVE: Record<LunaVividTone, string> = {
  default: 'border-line-subtle bg-raised text-fg ring-2 ring-accent/35',
  blue: 'border-sky-700/50 bg-sky-600 text-white shadow-md shadow-sky-950/40 ring-2 ring-white/30',
  green:
    'border-emerald-700/50 bg-emerald-600 text-white shadow-md shadow-emerald-950/40 ring-2 ring-white/30',
  amber:
    'border-amber-700/50 bg-amber-600 text-white shadow-md shadow-amber-950/40 ring-2 ring-white/30',
  rose: 'border-rose-700/50 bg-rose-600 text-white shadow-md shadow-rose-950/40 ring-2 ring-white/30',
  violet:
    'border-violet-700/50 bg-violet-600 text-white shadow-md shadow-violet-950/40 ring-2 ring-white/30',
  cyan: 'border-cyan-700/50 bg-cyan-600 text-white shadow-md shadow-cyan-950/40 ring-2 ring-white/30',
}

const VIVID_ICON_CHIP: Record<LunaVividTone, string> = {
  default: 'bg-canvas/90 text-fg-dim',
  blue: 'bg-white/20 text-white',
  green: 'bg-white/20 text-white',
  amber: 'bg-white/20 text-white',
  rose: 'bg-white/20 text-white',
  violet: 'bg-white/20 text-white',
  cyan: 'bg-white/20 text-white',
}

const VIVID_DOT: Record<LunaVividTone, string> = {
  default: 'bg-fg-muted',
  blue: 'bg-sky-400',
  green: 'bg-emerald-400',
  amber: 'bg-amber-400',
  rose: 'bg-rose-400',
  violet: 'bg-violet-400',
  cyan: 'bg-cyan-400',
}

const VIVID_BORDER_LEFT: Record<LunaVividTone, string> = {
  default: 'border-l-fg-muted',
  blue: 'border-l-sky-500',
  green: 'border-l-emerald-500',
  amber: 'border-l-amber-500',
  rose: 'border-l-rose-500',
  violet: 'border-l-violet-500',
  cyan: 'border-l-cyan-500',
}

export function lunaVividTone(
  tone: LunaVividTone | undefined,
): LunaVividTone {
  return tone ?? 'default'
}

export function lunaHasVividTone(tone: LunaVividTone | undefined): boolean {
  return lunaVividTone(tone) !== 'default'
}

/** Cartão / bloco sólido com cor vibrante (pastas, destaques). */
export function lunaVividShellClass(
  tone: LunaVividTone | undefined,
  active = false,
): string {
  const id = lunaVividTone(tone)
  const shell = active ? VIVID_SHELL_ACTIVE[id] : VIVID_SHELL[id]
  return `rounded-2xl transition-all duration-200 ${shell}`
}

export function lunaVividIconChipClass(tone: LunaVividTone | undefined): string {
  return VIVID_ICON_CHIP[lunaVividTone(tone)]
}

export function lunaVividDotClass(tone: LunaVividTone | undefined): string {
  return VIVID_DOT[lunaVividTone(tone)]
}

export function lunaVividBorderLeftClass(tone: LunaVividTone | undefined): string {
  return VIVID_BORDER_LEFT[lunaVividTone(tone)]
}

/** Controlos sobre fundo vibrante (ícones, setas). */
export function lunaVividControlClass(tone: LunaVividTone | undefined): string {
  return lunaHasVividTone(tone)
    ? 'text-white/90 hover:bg-white/15'
    : 'text-fg-muted hover:bg-canvas/60 hover:text-fg'
}

/** Item de navegação lateral — base + estado. */
export const lunaNavItemBase =
  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-all duration-200'

export function lunaNavItemClass(active: boolean): string {
  return active ? 'luna-nav-item luna-nav-item--active' : 'luna-nav-item luna-nav-item--idle'
}

/** Botão quadrado da barra de actividade / context rail. */
export function lunaIconBtnClass(active: boolean): string {
  return active ? 'luna-icon-btn luna-icon-btn--active' : 'luna-icon-btn'
}

/** Linha de lista (conversas no histórico). */
export function lunaListRowClass(selected: boolean): string {
  return `luna-list-row group flex flex-col ${selected ? 'luna-list-row--selected' : 'luna-list-row--idle'}`
}

export type LunaStatusState = 'success' | 'warning' | 'danger'

export function lunaStatusDotClass(state: LunaStatusState): string {
  return `luna-status-dot luna-status-dot--${state}`
}

export function lunaTabClass(active: boolean): string {
  return active ? 'luna-tab luna-tab--active' : 'luna-tab'
}

/** Tab do editor Luna Forge — estilo Cursor (tab activa ligada ao conteúdo). */
export function lunaForgeTabClass(active: boolean): string {
  return active ? 'forge-tab forge-tab--active' : 'forge-tab'
}

/** Marcador BEM para secções com acento de cor (fundo neutro + barra lateral). */
function toneId(tone: LunaVividTone | undefined): LunaVividTone {
  return lunaVividTone(tone)
}

/**
 * Secção com hierarquia legível: superfície neutra + barra/fundo teintado.
 * Usar para agrupamentos (memórias, pastas em repouso).
 */
export function lunaToneSectionClass(
  tone: LunaVividTone | undefined,
  emphasized = false,
): string {
  const id = toneId(tone)
  const emph = emphasized ? ' luna-tone-section--emphasized' : ''
  return `luna-tone-section luna-tone-section--${id}${emph}`
}

/** Título de secção — cor de acento, contraste garantido por tema. */
export function lunaToneHeadingClass(tone: LunaVividTone | undefined): string {
  return `luna-tone-heading luna-tone-heading--${toneId(tone)}`
}

/** Contador / meta numérica na cabeçalho da secção. */
export function lunaToneCountClass(tone: LunaVividTone | undefined): string {
  const id = toneId(tone)
  return id === 'default' ? 'luna-tone-count' : `luna-tone-count luna-tone-count--${id}`
}

/** Linha de conteúdo dentro de secção teintada — sempre texto `fg` legível. */
export const lunaToneNoteClass = 'luna-tone-note'

/** Chip de ícone sobre secção teintada (não saturado). */
export function lunaToneIconChipClass(tone: LunaVividTone | undefined): string {
  const id = toneId(tone)
  return id === 'default'
    ? 'luna-tone-icon-chip luna-tone-icon-chip--default'
    : `luna-tone-icon-chip luna-tone-icon-chip--${id}`
}

/** Filtro / tab: activo com acento subtil (não bloco sólido). */
export function lunaFilterPillClass(
  tone: LunaVividTone | undefined,
  active: boolean,
): string {
  const base = 'luna-filter-pill tabular-nums'
  if (!active) return `${base} luna-filter-pill--idle`
  const id = toneId(tone)
  if (id === 'default') return `${base} luna-filter-pill--active`
  return `${base} luna-filter-pill--tone luna-filter-pill--tone-${id}`
}

export type LunaCloudSyncSurface = 'neutral' | 'vivid'

export type LunaCloudSyncVisualState =
  | 'off'
  | 'on'
  | 'pending'
  | 'syncing'
  | 'error'

export function lunaCloudSyncVisualState(
  enabled: boolean,
  syncState: string,
): LunaCloudSyncVisualState {
  if (!enabled) return 'off'
  if (syncState === 'syncing') return 'syncing'
  if (syncState === 'error') return 'error'
  if (syncState === 'pending') return 'pending'
  return 'on'
}

/** Botão de cloud sync no histórico — superfície neutra (listas) ou vivid (pasta seleccionada). */
export function lunaCloudSyncBtnClass(
  surface: LunaCloudSyncSurface,
  visual: LunaCloudSyncVisualState,
): string {
  return `luna-cloud-sync-btn luna-cloud-sync-btn--${surface} luna-cloud-sync-btn--${visual}`
}
