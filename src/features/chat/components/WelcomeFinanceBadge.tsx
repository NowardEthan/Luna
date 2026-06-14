import type { WelcomeFinanceBadgeKind } from '../contextualChatWelcome'

const KIND_CLASS: Record<WelcomeFinanceBadgeKind, string> = {
  tab: 'border-accent/40 bg-accent-muted text-accent',
  money: 'border-success/35 bg-success-muted text-success',
  month: 'border-line bg-canvas text-fg-muted',
  account: 'border-line bg-raised text-fg',
  goal: 'border-accent/35 bg-accent-muted text-accent',
  count: 'border-warning/35 bg-warning-muted text-warning',
}

type Props = {
  kind: WelcomeFinanceBadgeKind
  label: string
  size?: 'sm' | 'md'
}

export function WelcomeFinanceBadge({ kind, label, size = 'md' }: Props) {
  const text = size === 'sm' ? 'text-[10px]' : 'text-[11px]'
  return (
    <span
      className={`luna-chip inline-flex max-w-[min(100%,12rem)] items-center !rounded-full !px-2 !py-0.5 align-middle leading-tight ${text} ${KIND_CLASS[kind]}`}
      title={label}
    >
      <span className="truncate">{label}</span>
    </span>
  )
}
