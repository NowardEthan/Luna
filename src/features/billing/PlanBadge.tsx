import type { LunaPlanId } from '../../lib/firebase/entitlements'
import { PLAN_DISPLAY_LABELS } from './plans'

type Props = {
  planId: LunaPlanId
  onClick?: () => void
}

const BADGE_CLASS: Partial<Record<LunaPlanId, string>> = {
  plus: 'bg-accent/15 text-accent',
  pro: 'bg-accent text-accent-fg',
  byok: 'bg-raised-hover text-fg-dim',
  team: 'bg-accent text-accent-fg',
}

export function PlanBadge({ planId, onClick }: Props) {
  const isFree = planId === 'free'
  const colorClass = isFree
    ? 'text-fg-muted hover:text-fg'
    : (BADGE_CLASS[planId] ?? 'bg-raised text-fg-muted')
  const label = isFree ? 'Ver planos' : PLAN_DISPLAY_LABELS[planId]

  return (
    <button
      type="button"
      onClick={onClick}
      title={isFree ? 'Ver planos e fazer upgrade' : 'Gerenciar plano'}
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-opacity hover:opacity-80 ${colorClass}`}
    >
      {label}
    </button>
  )
}
