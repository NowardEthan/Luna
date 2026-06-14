import { useState } from 'react'
import type { LunaPlanId } from '../../lib/firebase/entitlements'
import { showToast } from '../../lib/toast'
import { startAsaasCheckout } from './billingApi'
import { requestCpfCnpj } from '../../lib/cpfCnpjPrompt'
import { PLANS, type PlanConfig } from './plans'
import { PlanCard } from './PlanCard'

type Props = {
  open: boolean
  onClose: () => void
  currentPlanId: LunaPlanId
}

function openPaymentLink(url: string) {
  if (!url) return
  window.open(url, '_blank', 'noreferrer')
}

export function BillingModal({ open, onClose, currentPlanId }: Props) {
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly')

  if (!open) return null

  const handleSelect = async (plan: PlanConfig) => {
    const cpfCnpj = await requestCpfCnpj()
    if (!cpfCnpj) {
      showToast('CPF ou CNPJ é obrigatório para assinar.', 'error', 5000)
      return
    }
    const result = await startAsaasCheckout(plan.id, period, cpfCnpj)
    if (result.ok) {
      openPaymentLink(result.url)
    } else {
      showToast(result.error, 'error', 6000)
    }
  }

  return (
    <div
      className="luna-overlay-scrim fixed inset-0 z-[85] flex items-start justify-center overflow-y-auto p-4 py-8"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="billing-modal-title"
        aria-modal="true"
        className="luna-dialog w-full max-w-5xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="billing-modal-title" className="text-lg font-semibold text-fg">
              Escolha seu plano
            </h2>
            <p className="mt-1 max-w-lg text-[12px] text-fg-muted">
              Claude vende um motor forte. Luna vende uma oficina inteira,
              onde qualquer motor trabalha melhor.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="luna-modal-close shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Período */}
        <div className="mb-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPeriod('monthly')}
            className={[
              'luna-filter-pill',
              period === 'monthly' ? 'luna-filter-pill--active' : 'luna-filter-pill--idle',
            ].join(' ')}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setPeriod('annual')}
            className={[
              'luna-filter-pill flex items-center gap-1.5',
              period === 'annual' ? 'luna-filter-pill--active' : 'luna-filter-pill--idle',
            ].join(' ')}
          >
            Anual
            <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-semibold text-success">
              2 meses grátis
            </span>
          </button>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlanId={currentPlanId}
              billingPeriod={period}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* Footer */}
        <p className="mt-5 text-center text-[10px] text-fg-muted">
          Pagamentos via Asaas · PIX, boleto e cartão · Cancele a qualquer momento
        </p>
      </div>
    </div>
  )
}
