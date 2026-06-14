import { useEffect, useMemo, useRef, useState, type FC, type SVGProps } from 'react'
import { useTranslation } from 'react-i18next'
import { formatBytes } from '../../lib/formatBytes'
import { lunaStatusDotClass } from '../../lib/lunaVisual'
import { isRealLunarUser } from '../../lib/lunarAccount'
import { readLunaCloudConfig } from '../../lib/lunaCloud'
import { cloudSyncService } from '../sync/cloudSyncService'
import { useCloudSyncTick } from '../sync/useCloudSyncTick'
import { useLunaAuth } from './AuthProvider'
import { LunarAccountModal } from './LunarAccountModal'
import { LunarAccountSignIn } from './LunarAccountSignIn'
import { CloudStorageQuotaBar } from './CloudStorageQuotaBar'
import { useLunarAccountStats } from './useLunarAccountStats'
import { PLANS, PLAN_DISPLAY_LABELS } from '../billing/plans'
import { PlanCard } from '../billing/PlanCard'
import { useLunaUsage } from '../billing/useLunaUsage'
import { useLunaUsageHistory } from '../billing/useLunaUsageHistory'
import type { PlanConfig } from '../billing/plans'
import { deleteLunarAccount, startAsaasCheckout, startCreditPackCheckout } from '../billing/billingApi'
import { useSyncPreferences } from '../sync/useSyncPreferences'
import { Switch } from '../../components/ui/Switch'
import { requestCpfCnpj } from '../../lib/cpfCnpjPrompt'
import { ByokProviderSelector } from '../billing/ByokProviderSelector'
import {
  daysUntilDate,
  formatNextDueDate,
} from '../billing/parseBilling'
import { showToast } from '../../lib/toast'
import type { LunaPlanId } from '../../lib/firebase/entitlements'
import type { LunaUsageSnapshot } from '../billing/useLunaUsage'
import { Skeleton } from '../../ui/Skeleton'

type Tab = 'conta' | 'uso' | 'planos' | 'cloud'

type Props = {
  onClose?: () => void
  reason?: string | null
  initialTab?: Tab
}

// ── Icons ──────────────────────────────────────────────────────────────────

function IconUser() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function IconUsage() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7" width="4" height="14" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  )
}

function IconPlans() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  )
}

function IconCloud() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  )
}

const TABS: { id: Tab; label: string; Icon: FC<SVGProps<SVGSVGElement>> }[] = [
  { id: 'conta', label: 'Conta', Icon: IconUser },
  { id: 'uso', label: 'Uso', Icon: IconUsage },
  { id: 'planos', label: 'Planos', Icon: IconPlans },
  { id: 'cloud', label: 'Cloud', Icon: IconCloud },
]

const PLAN_BADGE_CLASS: Partial<Record<LunaPlanId, string>> = {
  free: 'bg-raised text-fg-muted',
  plus: 'bg-accent/15 text-accent',
  pro: 'bg-accent text-accent-fg',
  byok: 'bg-raised-hover text-fg-dim',
  team: 'bg-accent text-accent-fg',
}

function pctColor(pct: number) {
  if (pct >= 90) return 'bg-danger'
  if (pct >= 70) return 'bg-warning'
  return 'bg-accent'
}

function pctTextColor(pct: number) {
  if (pct >= 90) return 'text-danger'
  if (pct >= 70) return 'text-warning'
  return 'text-accent'
}

// ── Shared components ──────────────────────────────────────────────────────

function UserAvatar({
  name,
  email,
  photoUrl,
}: {
  name: string
  email?: string | null
  photoUrl?: string | null
}) {
  const initial = (name || email || '?').trim().charAt(0).toUpperCase()
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className="size-10 shrink-0 rounded-full object-cover ring-2 ring-line"
        referrerPolicy="no-referrer"
      />
    )
  }
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-muted text-base font-semibold text-accent ring-2 ring-line">
      {initial}
    </span>
  )
}

function MetricRow({
  label,
  local,
  remote,
}: {
  label: string
  local: string
  remote?: string
}) {
  return (
    <div className="grid grid-cols-[6rem_1fr_1fr] items-baseline gap-x-3 text-ui">
      <span className="text-fg-muted">{label}</span>
      <span className="font-medium text-fg">{local}</span>
      <span className="font-medium text-fg-dim">{remote ?? '—'}</span>
    </div>
  )
}

function UsageMeterSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="A carregar uso mensal">
      {compact ? (
        <>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] text-fg-muted">Uso mensal</span>
            <Skeleton className="h-3 w-8 rounded-full" />
          </div>
          <Skeleton className="h-1 w-full rounded-full" />
        </>
      ) : (
        <>
          <div className="flex items-baseline justify-between">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
      {children}
    </p>
  )
}

// ── Tab: Conta ─────────────────────────────────────────────────────────────

function ContaTab({ onClose }: { onClose?: () => void; planId?: LunaPlanId }) {
  const { t } = useTranslation()
  const auth = useLunaAuth()
  const cloudActive = auth.isLunarConnected
  const signedIn = isRealLunarUser(auth.user)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const handleSignOut = async () => {
    await auth.signOut()
    onClose?.()
  }

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    if (deleteBusy) return
    setDeleteBusy(true)
    try {
      const result = await deleteLunarAccount()
      if (result.ok) {
        showToast('Conta excluída.', 'info', 5000)
        await auth.signOut()
        onClose?.()
      } else {
        showToast(result.error ?? 'Não foi possível excluir a conta.', 'error', 6000)
        setDeleteConfirm(false)
      }
    } finally {
      setDeleteBusy(false)
    }
  }

  const memberSince = auth.user?.metadata?.creationTime
    ? new Date(auth.user.metadata.creationTime).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
      })
    : '—'

  return (
    <div className="flex flex-col gap-6">
      {/* Conexão */}
      <div>
        <SectionLabel>Conexão</SectionLabel>
        <div className="rounded-xl border border-line bg-canvas px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={lunaStatusDotClass(cloudActive ? 'success' : 'warning')} aria-hidden />
            <span className="text-[12px] text-fg-dim">
              {cloudActive ? 'Conectado à nuvem' : signedIn ? 'Offline (conta ativa)' : 'Sem sessão ativa'}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-fg-muted">
            {cloudActive
              ? 'Memórias e conversas sincronizando automaticamente.'
              : 'Sincronização de nuvem desativada.'}
          </p>
        </div>
      </div>

      {/* Perfil */}
      <div>
        <SectionLabel>Perfil</SectionLabel>
        <div className="space-y-0 rounded-xl border border-line overflow-hidden">
          <div className="flex items-center justify-between bg-canvas px-4 py-2.5">
            <span className="text-[11px] text-fg-muted">Nome</span>
            <span className="text-[12px] font-medium text-fg">
              {auth.user?.displayName || '—'}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-line-subtle bg-canvas px-4 py-2.5">
            <span className="text-[11px] text-fg-muted">Email</span>
            <span className="max-w-[180px] truncate text-[12px] font-medium text-fg">
              {auth.user?.email || '—'}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-line-subtle bg-canvas px-4 py-2.5">
            <span className="text-[11px] text-fg-muted">Membro desde</span>
            <span className="text-[12px] text-fg-dim">{memberSince}</span>
          </div>
          <div className="flex items-center justify-between border-t border-line-subtle bg-canvas px-4 py-2.5">
            <span className="text-[11px] text-fg-muted">Provedor</span>
            <span className="flex items-center gap-1.5 text-[12px] text-fg-dim">
              <span className="text-[11px]">G</span> Google
            </span>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-col gap-2">
        {signedIn && !cloudActive ? (
          <button type="button" className="luna-btn-primary w-full px-4 py-2.5" onClick={() => auth.setUsageModeCloud()}>
            {t('lunarAccount.profile.enableCloud')}
          </button>
        ) : null}
        {cloudActive ? (
          <button type="button" className="luna-btn-secondary w-full px-3 py-2 text-ui" onClick={() => { auth.continueOffline(); onClose?.() }}>
            {t('lunarAccount.profile.offlineMode')}
          </button>
        ) : null}
        {signedIn ? (
          <button type="button" className="luna-btn-secondary w-full px-3 py-2 text-ui text-danger" onClick={() => void handleSignOut()}>
            {t('lunarAccount.profile.signOut')}
          </button>
        ) : null}
      </div>

      {/* Danger zone */}
      <div>
        <SectionLabel>Zona perigosa</SectionLabel>
        <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium text-fg">Excluir conta</p>
              <p className="mt-0.5 text-[11px] text-fg-muted">Remove permanentemente todos os dados.</p>
            </div>
            <button
              type="button"
              disabled={deleteBusy}
              onClick={() => void handleDeleteAccount()}
              className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold ${
                deleteConfirm
                  ? 'border-danger bg-danger text-white'
                  : 'border-danger/30 text-danger hover:bg-danger/10'
              }`}
            >
              {deleteBusy ? 'Excluindo…' : deleteConfirm ? 'Confirmar exclusão' : 'Excluir'}
            </button>
          </div>
        </div>
      </div>

      {auth.error ? (
        <p className="luna-callout-danger text-ui" role="alert">{auth.error}</p>
      ) : null}
    </div>
  )
}

// ── Tab: Uso ───────────────────────────────────────────────────────────────

function UsageTab({
  usage,
  planId,
  onNavigate,
  uid,
}: {
  usage: LunaUsageSnapshot
  planId: LunaPlanId
  onNavigate: (tab: Tab) => void
  uid: string | undefined
}) {
  const auth = useLunaAuth()
  const history = useLunaUsageHistory(3)
  const [packBusy, setPackBusy] = useState(false)
  const { used, limit, effectiveLimit, bonusTurns, pct, resetDays, breakdown, loading } = usage
  const isByok = planId === 'byok'
  const onTrial = auth.billing?.status === 'trial'
  const trialDaysLeft = daysUntilDate(auth.billing?.trialEndsAt)

  const handleCreditPack = async () => {
    if (packBusy) return
    const cpfCnpj = await requestCpfCnpj()
    if (!cpfCnpj) {
      showToast('CPF ou CNPJ é obrigatório para comprar créditos.', 'error', 5000)
      return
    }
    setPackBusy(true)
    try {
      const result = await startCreditPackCheckout(cpfCnpj)
      if (result.ok) {
        window.open(result.url, '_blank', 'noreferrer')
        showToast('Conclui o pagamento na janela Asaas — créditos em até 1 min.', 'info', 6000)
        void auth.refreshAccount()
      } else {
        showToast(result.error, 'error', 6000)
      }
    } finally {
      setPackBusy(false)
    }
  }

  if (isByok) {
    return (
      <div className="flex flex-col gap-5">
        <SectionLabel>Uso de API</SectionLabel>
        <div className="rounded-xl border border-line bg-canvas px-5 py-4 text-center">
          <span className="text-3xl">∞</span>
          <p className="mt-2 text-[13px] font-semibold text-fg">Uso ilimitado</p>
          <p className="mt-1 text-[12px] text-fg-muted">
            Você traz sua própria API — sem cotas mensais na Luna.
          </p>
        </div>

        <div>
          <SectionLabel>Provedores conectados</SectionLabel>
          {uid ? (
            <ByokProviderSelector uid={uid} />
          ) : (
            <p className="text-[12px] text-fg-muted">Inicie sessão para configurar chaves.</p>
          )}
          <p className="mt-2 text-center text-[10px] text-fg-muted">
            Chaves encriptadas neste dispositivo. Escolha um provedor activo para o pipeline.
          </p>
        </div>
      </div>
    )
  }

  const displayLimit = effectiveLimit ?? limit

  const COMPLEXITY_ITEMS = [
    { label: 'Baixo', value: breakdown.baixo, bg: 'bg-success/10', text: 'text-success', desc: '8B' },
    { label: 'Moderado', value: breakdown.moderado, bg: 'bg-accent/10', text: 'text-accent', desc: '32B' },
    { label: 'Alto', value: breakdown.alto, bg: 'bg-warning/10', text: 'text-warning', desc: '70B' },
    { label: 'Profundo', value: breakdown.profundo, bg: 'bg-danger/10', text: 'text-danger', desc: '405B' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <SectionLabel>Uso este mês</SectionLabel>

      {loading ? (
        <>
          <UsageMeterSkeleton />
          <div>
            <SectionLabel>Por complexidade</SectionLabel>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px] rounded-xl" />
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
      {onTrial && trialDaysLeft !== null ? (
        <p className="rounded-xl border border-accent/25 bg-accent/10 px-4 py-2.5 text-[12px] text-accent">
          Trial Pro — {trialDaysLeft} dia{trialDaysLeft === 1 ? '' : 's'} restante{trialDaysLeft === 1 ? '' : 's'}.
          Depois volta ao plano Free.
        </p>
      ) : null}

      {/* Main progress bar */}
      <div className="-mt-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[22px] font-bold tabular-nums text-fg">
            {used}
            <span className="ml-1 text-[13px] font-normal text-fg-muted">
              {displayLimit !== null
                ? `/ ${displayLimit.toLocaleString('pt-BR')} turns`
                : 'turns'}
            </span>
          </span>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[11px] text-fg-muted">
              {onTrial && trialDaysLeft !== null
                ? `Trial expira em ${trialDaysLeft}d`
                : `Renova em ${resetDays} dias`}
            </span>
            <span className={`text-[13px] font-semibold ${pctTextColor(pct)}`}>{pct}%</span>
          </div>
        </div>
        {bonusTurns > 0 ? (
          <p className="mb-2 text-[10px] text-fg-muted">
            Inclui +{bonusTurns.toLocaleString('pt-BR')} turns de pack avulso este mês.
          </p>
        ) : null}
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-raised">
          <div
            className={`h-full rounded-full transition-all ${pctColor(pct)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct >= 80 ? (
          <p className="mt-2 text-[11px] text-warning">
            Você está próximo do limite. Considere fazer upgrade ou adicionar créditos.
          </p>
        ) : null}
      </div>

      {/* Complexity breakdown */}
      <div>
        <SectionLabel>Por complexidade</SectionLabel>
        <div className="grid grid-cols-4 gap-2">
          {COMPLEXITY_ITEMS.map((c) => (
            <div key={c.label} className={`rounded-xl ${c.bg} px-2 py-3 text-center`}>
              <p className="text-[18px] font-bold tabular-nums text-fg">{c.value}</p>
              <p className={`mt-0.5 text-[9px] font-semibold uppercase tracking-wide ${c.text}`}>
                {c.label}
              </p>
              <p className="mt-1 text-[9px] text-fg-muted">{c.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-fg-muted">
          O TálamoPipeline roteia cada turn pelo modelo ideal automaticamente.
        </p>
      </div>
        </>
      )}

      {/* Add credits / upgrade CTA — visível após carregar */}
      {!loading ? (
        planId === 'free' ? (
        <button
          type="button"
          className="luna-btn-primary w-full px-4 py-2.5 text-[13px]"
          onClick={() => onNavigate('planos')}
        >
          Fazer upgrade para mais turns
        </button>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-line bg-canvas px-4 py-3">
          <div>
            <p className="text-[12px] font-semibold text-fg">Pack de créditos</p>
            <p className="mt-0.5 text-[11px] text-fg-muted">+500 turns por R$9 · válido por 30 dias</p>
          </div>
          <button
            type="button"
            disabled={packBusy}
            onClick={() => void handleCreditPack()}
            className="rounded-lg bg-accent px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60"
          >
            {packBusy ? '…' : 'Comprar'}
          </button>
        </div>
      )
      ) : null}

      {/* Histórico real (últimos 3 meses) */}
      {!loading ? (
      <div>
        <SectionLabel>Histórico</SectionLabel>
        {history.loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 rounded-lg" />
            ))}
          </div>
        ) : (
        <div className="space-y-3">
          {history.items.map((h) => {
            const monthLimit = (limit ?? 0) + h.bonusTurns
            const hPct = monthLimit > 0
              ? Math.min(100, Math.floor((h.used / monthLimit) * 100))
              : 0
            return (
              <div key={h.monthKey}>
                <div className="mb-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-fg-dim">{h.monthLabel}</span>
                  <span className="text-fg-muted">
                    {h.used.toLocaleString('pt-BR')} / {monthLimit.toLocaleString('pt-BR')}
                    {h.bonusTurns > 0 ? ` (+${h.bonusTurns} pack)` : ''}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
                  <div
                    className={`h-full rounded-full ${hPct >= 90 ? 'bg-danger/60' : 'bg-accent/50'}`}
                    style={{ width: `${hPct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        )}
      </div>
      ) : null}
    </div>
  )
}

// ── Tab: Planos ────────────────────────────────────────────────────────────

function PlanosTab({ currentPlanId, usage }: { currentPlanId: LunaPlanId; usage: LunaUsageSnapshot }) {
  const auth = useLunaAuth()
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { used, limit, effectiveLimit, pct, loading } = usage
  const displayLimit = effectiveLimit ?? limit
  const onTrial = auth.billing?.status === 'trial'

  useEffect(() => {
    void auth.refreshAccount()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [auth.refreshAccount])

  const startPlanPoll = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    const stopAt = Date.now() + 120_000
    void auth.refreshAccount()
    pollRef.current = setInterval(() => {
      void auth.refreshAccount()
      if (Date.now() > stopAt && pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }, 5_000)
  }

  const handleSelect = async (plan: PlanConfig) => {
    if (checkoutBusy) return
    const cpfCnpj = await requestCpfCnpj()
    if (!cpfCnpj) {
      showToast('CPF ou CNPJ é obrigatório para assinar.', 'error', 5000)
      return
    }
    setCheckoutBusy(true)
    try {
      const result = await startAsaasCheckout(plan.id, period, cpfCnpj)
      if (result.ok) {
        window.open(result.url, '_blank', 'noreferrer')
        startPlanPoll()
        if (result.source === 'api') {
          showToast(
            'Assinatura criada — conclui o pagamento na janela Asaas.',
            'info',
            6000,
          )
        }
      } else {
        showToast(result.error, 'error', 6000)
      }
    } finally {
      setCheckoutBusy(false)
    }
  }

  const nextDueLabel = formatNextDueDate(auth.billing?.nextDueDate)
  const renewDays = daysUntilDate(auth.billing?.nextDueDate)

  return (
    <div className="flex flex-col gap-4">
      {/* Uso atual antes dos planos */}
      {onTrial ? (
        <p className="rounded-xl border border-accent/25 bg-accent/10 px-4 py-3 text-[12px] text-accent">
          Você está no trial Pro de 7 dias — aproveite todos os recursos!
        </p>
      ) : null}

      {currentPlanId !== 'byok' && displayLimit !== null ? (
        loading ? (
          <div className="rounded-xl border border-line-subtle bg-canvas px-4 py-3">
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
        <div className="rounded-xl border border-line-subtle bg-canvas px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-fg-dim">
              Seu plano atual: <span className="font-semibold text-fg">{PLAN_DISPLAY_LABELS[currentPlanId]}</span>
            </p>
            <span className={`text-[11px] font-semibold ${pctTextColor(pct)}`}>
              {used} / {displayLimit.toLocaleString('pt-BR')} turns
            </span>
          </div>
          {pct >= 70 ? (
            <p className="mt-1 text-[11px] text-warning">
              Uso elevado este mês — um upgrade garante mais headroom.
            </p>
          ) : null}
        </div>
        )
      ) : null}

      {auth.billingOverdue ? (
        <p className="rounded-xl border border-warning/30 bg-warning-muted px-4 py-3 text-[12px] text-warning">
          Pagamento em atraso — regulariza na Asaas para manter o plano activo.
        </p>
      ) : null}

      {currentPlanId !== 'free' && nextDueLabel ? (
        <p className="text-center text-[11px] text-fg-muted">
          {renewDays !== null && renewDays <= 14
            ? `Renova em ${renewDays} dias`
            : `Próxima cobrança: ${nextDueLabel}`}
        </p>
      ) : null}

      {/* Period toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPeriod('monthly')}
          className={['luna-filter-pill', period === 'monthly' ? 'luna-filter-pill--active' : 'luna-filter-pill--idle'].join(' ')}
        >
          Mensal
        </button>
        <button
          type="button"
          onClick={() => setPeriod('annual')}
          className={['luna-filter-pill flex items-center gap-1.5', period === 'annual' ? 'luna-filter-pill--active' : 'luna-filter-pill--idle'].join(' ')}
        >
          Anual
          <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-semibold text-success">
            2 meses grátis
          </span>
        </button>
      </div>

      {/* Cards 2×2 */}
      <div className="grid grid-cols-2 gap-3">
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

      <p className="text-center text-[10px] text-fg-muted">
        Pagamentos via Asaas · PIX, boleto e cartão · Cancele a qualquer momento
      </p>
    </div>
  )
}

// ── Tab: Cloud ─────────────────────────────────────────────────────────────

const SYNC_TOGGLE_ITEMS: {
  key: 'conversations' | 'memory' | 'folders' | 'modelPrefs' | 'plugins'
  label: string
  editable: boolean
}[] = [
  { key: 'conversations', label: 'Conversas e histórico', editable: true },
  { key: 'memory', label: 'Memória do usuário', editable: true },
  { key: 'folders', label: 'Pastas e organização', editable: true },
  { key: 'modelPrefs', label: 'Preferências de modelo', editable: false },
  { key: 'plugins', label: 'Plugins instalados', editable: false },
]

function CloudTab() {
  const { t, i18n } = useTranslation()
  const auth = useLunaAuth()
  const { prefs, loading: prefsLoading, setPref } = useSyncPreferences()
  const cloud = useMemo(() => readLunaCloudConfig(), [])
  const cloudActive = auth.isLunarConnected
  const showRemote = cloudActive && cloud.syncEnabled
  const { local, remote, remoteLoading, remoteError, storage, storageLoading } =
    useLunarAccountStats(showRemote, auth.plan)
  useCloudSyncTick()
  const sync = cloudSyncService.getStatus()
  const [syncing, setSyncing] = useState(false)

  const syncLabel = sync.lastSyncAt
    ? new Date(sync.lastSyncAt).toLocaleString(i18n.language, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : t('lunarAccount.profile.syncNever')

  const remoteConv = remoteLoading ? '…' : remoteError ? '—' : remote ? String(remote.conversationCount) : '—'
  const remoteSize = remoteLoading ? '…' : remoteError ? '—' : remote ? formatBytes(remote.estimatedBytes) : '—'

  const handleSync = async () => {
    setSyncing(true)
    try { await cloudSyncService.pullFromCloud() } finally { setSyncing(false) }
  }

  return (
    <div className="flex flex-col gap-5">
      {storage ? (
        <CloudStorageQuotaBar quota={storage.quota} loading={storageLoading} />
      ) : null}

      <div>
        <SectionLabel>{t('lunarAccount.profile.cloudSummary')}</SectionLabel>
        {showRemote ? (
          <div className="mb-1 grid grid-cols-[6rem_1fr_1fr] gap-x-3 text-[9px] font-medium uppercase tracking-wide text-fg-muted">
            <span />
            <span>{t('lunarAccount.profile.colThisPc')}</span>
            <span>{t('lunarAccount.profile.colFirestore')}</span>
          </div>
        ) : null}
        <div className="space-y-2">
          <MetricRow
            label={t('lunarAccount.profile.metricConversations')}
            local={`${local.conversationsInCloud}${local.conversationsTotal > local.conversationsInCloud ? ` / ${local.conversationsTotal}` : ''}`}
            remote={showRemote ? remoteConv : undefined}
          />
          <MetricRow
            label={t('lunarAccount.profile.metricFolders')}
            local={`${local.foldersInCloud}${local.foldersTotal > local.foldersInCloud ? ` / ${local.foldersTotal}` : ''}`}
          />
          <MetricRow
            label={t('lunarAccount.profile.metricMessages')}
            local={String(local.messagesInCloud)}
          />
          <MetricRow
            label={t('lunarAccount.profile.metricSize')}
            local={formatBytes(local.estimatedBytes)}
            remote={showRemote ? remoteSize : undefined}
          />
        </div>
        {showRemote && remoteError ? <p className="luna-callout-danger mt-2">{remoteError}</p> : null}
        {cloudActive ? (
          <p className="mt-3 border-t border-line-subtle pt-2.5 text-[11px] text-fg-muted">
            {t('lunarAccount.profile.lastSync', { date: syncLabel, errorSuffix: sync.lastError ? ` · ${sync.lastError}` : '' })}
          </p>
        ) : (
          <p className="mt-3 text-[11px] text-fg-muted">{t('lunarAccount.profile.cloudHint')}</p>
        )}
      </div>

      {/* O que é sincronizado */}
      <div>
        <SectionLabel>O que é sincronizado</SectionLabel>
        <div className="space-y-0 rounded-xl border border-line overflow-hidden">
          {SYNC_TOGGLE_ITEMS.map((item, i) => (
            <div
              key={item.key}
              className={`flex items-center justify-between gap-3 bg-canvas px-4 py-2.5 ${i > 0 ? 'border-t border-line-subtle' : ''}`}
            >
              <span className="text-[12px] text-fg-dim">{item.label}</span>
              {item.editable ? (
                <Switch
                  checked={prefs[item.key]}
                  disabled={prefsLoading || !auth.isLunarConnected}
                  onChange={(on) => void setPref(item.key, on)}
                  className="shrink-0"
                />
              ) : (
                <span className="text-[10px] font-semibold text-fg-muted">○ Em breve</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {cloudActive && cloud.syncEnabled ? (
        <button
          type="button"
          className="luna-btn-primary w-full px-4 py-2.5"
          disabled={syncing || sync.pushing}
          onClick={() => void handleSync()}
        >
          {syncing || sync.pushing ? t('lunarAccount.profile.syncing') : t('lunarAccount.profile.syncNow')}
        </button>
      ) : null}
    </div>
  )
}

// ── Main gate screen ───────────────────────────────────────────────────────

/** Modal unificada — sign-in com benefícios ou painel com 4 tabs. */
export function LunarGateScreen({ onClose, reason, initialTab = 'conta' }: Props) {
  const auth = useLunaAuth()
  const signedIn = isRealLunarUser(auth.user)
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  useEffect(() => {
    if (signedIn) void auth.refreshAccount()
  }, [signedIn, auth.refreshAccount])

  const planId: LunaPlanId = auth.plan ?? 'free'
  const displayName = auth.user?.displayName || auth.user?.email?.split('@')[0] || 'Usuário'
  const email = auth.user?.email ?? null

  const usage = useLunaUsage()
  const { pct, loading: usageLoading } = usage

  if (!signedIn) {
    return (
      <LunarAccountModal onClose={onClose} size="md">
        <LunarAccountSignIn onClose={onClose} reason={reason} />
      </LunarAccountModal>
    )
  }

  return (
    <LunarAccountModal onClose={onClose} size="xl">
      <div className="flex min-h-[520px] flex-col sm:flex-row">

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <aside className="flex shrink-0 flex-col border-b border-line bg-sidebar sm:w-52 sm:border-b-0 sm:border-r">
          {/* User header */}
          <div className="flex items-center gap-3 px-4 py-5 pr-12">
            <UserAvatar name={displayName} email={email} photoUrl={auth.user?.photoURL} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-fg">{displayName}</p>
              {email ? <p className="truncate text-[11px] text-fg-muted">{email}</p> : null}
            </div>
          </div>

          {/* Plan + mini usage */}
          <div className="border-t border-line-subtle px-4 py-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-fg-muted">Plano</span>
              <div className="flex items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PLAN_BADGE_CLASS[planId] ?? 'bg-raised text-fg-muted'}`}>
                  {PLAN_DISPLAY_LABELS[planId]}
                </span>
                {planId === 'free' ? (
                  <button type="button" onClick={() => setActiveTab('planos')} className="text-[10px] font-medium text-accent hover:underline">
                    Upgrade
                  </button>
                ) : null}
              </div>
            </div>

            {/* Mini usage bar — só se tem limite */}
            {planId !== 'byok' ? (
              usageLoading ? (
                <UsageMeterSkeleton compact />
              ) : (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] text-fg-muted">Uso mensal</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('uso')}
                    className={`text-[10px] font-semibold hover:underline ${pctTextColor(pct)}`}
                  >
                    {pct}%
                  </button>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-raised">
                  <div className={`h-full rounded-full transition-all ${pctColor(pct)}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              )
            ) : null}
          </div>

          {/* Nav */}
          <nav className="flex gap-0.5 overflow-x-auto px-2 py-2 sm:flex-col sm:overflow-x-visible sm:py-3">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={[
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors',
                  activeTab === id ? 'bg-raised text-fg' : 'text-fg-muted hover:bg-raised/60 hover:text-fg',
                  id === 'planos' && planId === 'free' && activeTab !== 'planos' ? '!text-accent' : '',
                ].filter(Boolean).join(' ')}
              >
                <Icon />
                <span>{label}</span>
                {id === 'planos' && planId === 'free' ? (
                  <span className="ml-auto rounded-full bg-accent/15 px-1.5 py-0.5 text-[8px] font-bold text-accent">↑</span>
                ) : null}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Content ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-8 sm:px-6 sm:pb-6 sm:pr-10 sm:pt-8">
          {activeTab === 'conta' ? <ContaTab onClose={onClose} planId={planId} /> : null}
          {activeTab === 'uso' ? (
            <UsageTab
              usage={usage}
              planId={planId}
              onNavigate={setActiveTab}
              uid={auth.user?.uid}
            />
          ) : null}
          {activeTab === 'planos' ? <PlanosTab currentPlanId={planId} usage={usage} /> : null}
          {activeTab === 'cloud' ? <CloudTab /> : null}
        </div>
      </div>
    </LunarAccountModal>
  )
}
