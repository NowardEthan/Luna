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
  neutral: 'border border-line-subtle bg-raised text-fg-dim',
  violet: 'border border-line-subtle bg-raised text-violet-300',
  amber: 'border border-line-subtle bg-raised text-amber-300',
  cyan: 'border border-line-subtle bg-raised text-cyan-300',
  sky: 'border border-line-subtle bg-accent-muted text-sky-300',
  emerald: 'border border-line-subtle bg-success-muted text-emerald-300',
  orange: 'border border-line-subtle bg-raised text-orange-300',
  lime: 'border border-line-subtle bg-raised text-lime-300',
  indigo: 'border border-line-subtle bg-raised text-indigo-300',
  fuchsia: 'border border-line-subtle bg-raised text-fuchsia-300',
  rose: 'border border-line-subtle bg-raised text-rose-300',
  teal: 'border border-line-subtle bg-raised text-teal-300',
  slate: 'border border-line-subtle bg-raised text-slate-300',
}

const LIGHT: Record<BadgeToneId, string> = {
  neutral: 'border border-line bg-raised text-fg',
  violet: 'border border-violet-300 bg-violet-100 text-violet-900',
  amber: 'border border-amber-300 bg-amber-100 text-amber-950',
  cyan: 'border border-cyan-300 bg-cyan-100 text-cyan-950',
  sky: 'border border-sky-300 bg-sky-100 text-sky-950',
  emerald: 'border border-emerald-300 bg-emerald-100 text-emerald-950',
  orange: 'border border-orange-300 bg-orange-100 text-orange-950',
  lime: 'border border-lime-400 bg-lime-100 text-lime-950',
  indigo: 'border border-indigo-300 bg-indigo-100 text-indigo-950',
  fuchsia: 'border border-fuchsia-300 bg-fuchsia-100 text-fuchsia-950',
  rose: 'border border-rose-300 bg-rose-100 text-rose-950',
  teal: 'border border-teal-300 bg-teal-100 text-teal-950',
  slate: 'border border-slate-400 bg-slate-200 text-slate-900',
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
