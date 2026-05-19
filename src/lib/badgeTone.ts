import { isLunaDarkTheme } from './lunaThemes'

export type BadgeToneId =
  | 'neutral'
  | 'violet'
  | 'amber'
  | 'cyan'
  | 'sky'
  | 'emerald'
  | 'orange'
  | 'lime'
  | 'indigo'
  | 'fuchsia'
  | 'rose'
  | 'teal'
  | 'slate'

const DARK: Record<BadgeToneId, string> = {
  neutral: 'bg-raised text-fg-dim ring-1 ring-line-subtle',
  violet: 'bg-violet-500/20 text-violet-200 ring-1 ring-violet-500/25',
  amber: 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/25',
  cyan: 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/25',
  sky: 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/25',
  emerald: 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/25',
  orange: 'bg-orange-500/20 text-orange-200 ring-1 ring-orange-500/25',
  lime: 'bg-lime-500/20 text-lime-200 ring-1 ring-lime-500/25',
  indigo: 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/25',
  fuchsia: 'bg-fuchsia-500/20 text-fuchsia-200 ring-1 ring-fuchsia-500/25',
  rose: 'bg-rose-500/20 text-rose-200 ring-1 ring-rose-500/25',
  teal: 'bg-teal-500/20 text-teal-200 ring-1 ring-teal-500/25',
  slate: 'bg-slate-500/20 text-slate-200 ring-1 ring-slate-500/25',
}

const LIGHT: Record<BadgeToneId, string> = {
  neutral: 'bg-raised text-fg ring-1 ring-line',
  violet: 'bg-violet-100 text-violet-900 ring-1 ring-violet-300/70',
  amber: 'bg-amber-100 text-amber-950 ring-1 ring-amber-400/60',
  cyan: 'bg-cyan-100 text-cyan-950 ring-1 ring-cyan-400/60',
  sky: 'bg-sky-100 text-sky-950 ring-1 ring-sky-400/60',
  emerald: 'bg-emerald-100 text-emerald-950 ring-1 ring-emerald-400/60',
  orange: 'bg-orange-100 text-orange-950 ring-1 ring-orange-400/60',
  lime: 'bg-lime-100 text-lime-950 ring-1 ring-lime-500/55',
  indigo: 'bg-indigo-100 text-indigo-950 ring-1 ring-indigo-400/60',
  fuchsia: 'bg-fuchsia-100 text-fuchsia-950 ring-1 ring-fuchsia-400/60',
  rose: 'bg-rose-100 text-rose-950 ring-1 ring-rose-400/60',
  teal: 'bg-teal-100 text-teal-950 ring-1 ring-teal-400/60',
  slate: 'bg-slate-200 text-slate-900 ring-1 ring-slate-400/55',
}

/** Classes de badge — inclui marcador CSS `luna-badge-tone--*` para temas claros. */
export function toolBadgeClass(tone: BadgeToneId): string {
  const marker = `luna-badge-tone--${tone}`
  return isLunaDarkTheme()
    ? `${marker} ${DARK[tone]}`
    : `${marker} ${LIGHT[tone]}`
}

export function memoryMentionBadgeClass(): string {
  return toolBadgeClass('violet')
}

/** Infere tom a partir de classes legadas (só tema escuro). */
export function badgeToneFromLegacyClass(badgeClass: string): BadgeToneId {
  const s = badgeClass.toLowerCase()
  if (s.includes('violet')) return 'violet'
  if (s.includes('amber')) return 'amber'
  if (s.includes('cyan')) return 'cyan'
  if (s.includes('sky')) return 'sky'
  if (s.includes('emerald')) return 'emerald'
  if (s.includes('orange')) return 'orange'
  if (s.includes('lime')) return 'lime'
  if (s.includes('indigo')) return 'indigo'
  if (s.includes('fuchsia')) return 'fuchsia'
  if (s.includes('rose')) return 'rose'
  if (s.includes('teal')) return 'teal'
  if (s.includes('slate')) return 'slate'
  return 'neutral'
}

export function resolveToolBadgeClass(badgeClass?: string): string {
  if (!badgeClass?.trim()) return toolBadgeClass('neutral')
  if (isLunaDarkTheme()) return badgeClass
  return toolBadgeClass(badgeToneFromLegacyClass(badgeClass))
}
