import { useTranslation } from 'react-i18next'
import { formatBytes } from '../../lib/formatBytes'
import type { CloudQuotaSnapshot } from '../../lib/lunarCloudQuota'
import type { LunaPlanId } from '../../lib/firebase/entitlements'

type Props = {
  quota: CloudQuotaSnapshot
  loading?: boolean
}

function planKey(plan: LunaPlanId): string {
  return `lunarAccount.plan.${plan}` as const
}

export function CloudStorageQuotaBar({ quota, loading }: Props) {
  const { t } = useTranslation()
  const plan = t(planKey(quota.plan))
  const barColor = quota.atLimit
    ? 'bg-danger'
    : quota.nearLimit
      ? 'bg-warning'
      : 'bg-success'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
          {t('lunarAccount.storage.title', { plan })}
        </p>
        <span className="text-[10px] tabular-nums text-fg-dim">
          {loading ? '…' : `${quota.percentUsed}%`}
        </span>
      </div>
      <QuotaBar quota={quota} barColor={barColor} progressAria={t('lunarAccount.storage.progressAria')} />
      <div className="flex justify-between gap-2 text-[10px] text-fg-muted">
        <span>
          {t('lunarAccount.storage.used')}{' '}
          <span className="font-medium text-fg-dim">
            {loading ? '…' : formatBytes(quota.usedBytes)}
          </span>
          <span className="text-fg-muted"> / {formatBytes(quota.limitBytes)}</span>
        </span>
        <span>
          {t('lunarAccount.storage.available')}{' '}
          <span className="font-medium text-fg-dim">
            {loading ? '…' : formatBytes(quota.availableBytes)}
          </span>
        </span>
      </div>
      {quota.atLimit ? (
        <p className="text-[10px] leading-snug text-danger">
          {t('lunarAccount.storage.atLimit', { plan })}
        </p>
      ) : quota.nearLimit ? (
        <p className="text-[10px] leading-snug text-warning">
          {t('lunarAccount.storage.nearLimit', { plan })}
        </p>
      ) : null}
    </div>
  )
}

function QuotaBar({
  quota,
  barColor,
  progressAria,
}: {
  quota: CloudQuotaSnapshot
  barColor: string
  progressAria: string
}) {
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-canvas ring-1 ring-line"
      role="progressbar"
      aria-valuenow={quota.percentUsed}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={progressAria}
    >
      <div
        className={`h-full rounded-full transition-all ${barColor}`}
        style={{
          width: `${Math.max(quota.percentUsed, quota.usedBytes > 0 ? 4 : 0)}%`,
        }}
      />
    </div>
  )
}
