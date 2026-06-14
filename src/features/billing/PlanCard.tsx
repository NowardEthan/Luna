import type { LunaPlanId } from '../../lib/firebase/entitlements'
import type { PlanConfig } from './plans'
import { isPlanCheckoutAvailable } from './asaasLinks'

type FeatureRowProps = {
  label: string
  available: boolean | 'limited'
  detail?: string
  vivid: boolean
}

function FeatureRow({ label, available, detail, vivid }: FeatureRowProps) {
  const icon =
    available === true ? (
      <span className={vivid ? 'text-white' : 'text-success'}>✓</span>
    ) : available === 'limited' ? (
      <span className={vivid ? 'text-white/70' : 'text-accent'}>~</span>
    ) : (
      <span className={vivid ? 'text-white/25' : 'text-fg-muted'}>✗</span>
    )

  return (
    <div className="flex items-center gap-2">
      <span className="w-3 shrink-0 text-center text-[11px]">{icon}</span>
      <span
        className={[
          'flex-1 text-[11px]',
          available === false
            ? vivid
              ? 'text-white/30'
              : 'text-fg-muted'
            : vivid
              ? 'text-white/85'
              : 'text-fg-dim',
        ].join(' ')}
      >
        {label}
      </span>
      {detail && (
        <span
          className={[
            'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold',
            vivid ? 'bg-white/15 text-white/80' : 'bg-raised text-fg-muted',
          ].join(' ')}
        >
          {detail}
        </span>
      )}
    </div>
  )
}

type Props = {
  plan: PlanConfig
  currentPlanId: LunaPlanId
  billingPeriod: 'monthly' | 'annual'
  onSelect: (plan: PlanConfig) => void
}

export function PlanCard({ plan, currentPlanId, billingPeriod, onSelect }: Props) {
  const isCurrent = plan.id === currentPlanId
  const vivid = plan.highlighted === true

  const price =
    billingPeriod === 'annual' && plan.priceAnnualMonthly !== null
      ? plan.priceAnnualMonthly
      : plan.priceMonthly

  const canCheckout = isPlanCheckoutAvailable(plan.id)

  const priceFormatted =
    price % 1 === 0 ? String(price) : price.toFixed(2).replace('.', ',')

  const ctaLabel =
    plan.id === 'byok'
      ? 'Conectar API'
      : `Assinar ${plan.name}`

  const ctaClass = [
    'w-full rounded-xl px-4 py-2 text-[12px] font-semibold transition-opacity',
    isCurrent || (plan.id !== 'free' && !canCheckout)
      ? vivid
        ? 'cursor-default bg-white/10 text-white/50'
        : 'cursor-default bg-raised text-fg-muted'
      : vivid
        ? 'cursor-pointer bg-white text-accent hover:opacity-90'
        : 'luna-btn-primary cursor-pointer',
  ].join(' ')

  return (
    <div className={['flex flex-col gap-4', vivid ? 'luna-card-vivid' : 'luna-card'].join(' ')}>
      {/* Badge */}
      {plan.badge && (
        <span
          className={[
            'self-start rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
            vivid ? 'bg-white/20 text-white' : 'bg-accent/15 text-accent',
          ].join(' ')}
        >
          {plan.badge}
        </span>
      )}

      {/* Name + tagline */}
      <div className="flex flex-col gap-1">
        <p className={['text-[13px] font-semibold', vivid ? 'text-white' : 'text-fg'].join(' ')}>
          {plan.name}
        </p>
        <p className={['text-[11px]', vivid ? 'text-white/60' : 'text-fg-muted'].join(' ')}>
          {plan.tagline}
        </p>
      </div>

      {/* Price */}
      <div className="flex flex-col gap-0.5">
        {plan.priceMonthly === 0 ? (
          <p className={['text-2xl font-bold', vivid ? 'text-white' : 'text-fg'].join(' ')}>
            Grátis
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span className={['text-[11px]', vivid ? 'text-white/60' : 'text-fg-muted'].join(' ')}>
                R$
              </span>
              <span
                className={[
                  'text-2xl font-bold tabular-nums',
                  vivid ? 'text-white' : 'text-fg',
                ].join(' ')}
              >
                {priceFormatted}
              </span>
              <span className={['text-[11px]', vivid ? 'text-white/60' : 'text-fg-muted'].join(' ')}>
                /mês
              </span>
            </div>
            {billingPeriod === 'annual' && plan.priceAnnual && (
              <p className={['text-[10px]', vivid ? 'text-white/50' : 'text-fg-muted'].join(' ')}>
                cobrado R${plan.priceAnnual}/ano
              </p>
            )}
          </>
        )}
        {plan.id === 'byok' && (
          <p className={['mt-0.5 text-[10px]', vivid ? 'text-white/50' : 'text-fg-muted'].join(' ')}>
            Claude · OpenAI · Groq · Together
          </p>
        )}
      </div>

      {/* Divider */}
      <div className={['h-px', vivid ? 'bg-white/15' : 'bg-line-subtle'].join(' ')} />

      {/* Features */}
      <div className="flex flex-1 flex-col gap-2">
        {plan.features.map((f) => (
          <FeatureRow key={f.label} vivid={vivid} {...f} />
        ))}
      </div>

      {/* CTA */}
      {plan.id === 'free' ? (
        <div
          className={[
            'rounded-xl px-4 py-2 text-center text-[12px]',
            vivid ? 'text-white/40' : 'text-fg-muted',
          ].join(' ')}
        >
          {isCurrent ? 'Plano atual' : 'Plano base'}
        </div>
      ) : (
        <button
          type="button"
          disabled={isCurrent || !canCheckout}
          onClick={() => !isCurrent && canCheckout && onSelect(plan)}
          className={ctaClass}
        >
          {isCurrent ? 'Plano atual' : !canCheckout ? 'Em breve' : ctaLabel}
        </button>
      )}
    </div>
  )
}
