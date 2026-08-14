import { getLunarAuthHeaders } from '../../lib/lunarAuthHeaders'
import { lunaServerBaseUrl } from '../../lib/lunaServer/config'
import { isLunaServerBridgeAvailable } from '../../lib/lunaServer/config'
import type { LunaPlanId } from '../../lib/firebase/entitlements'
import { getAsaasCheckoutLinks } from './asaasLinks'

export type BillingPeriod = 'monthly' | 'annual'

type CheckoutResult =
  | { ok: true; url: string; source: 'api' | 'link' }
  | { ok: false; error: string }

/** Abre checkout Asaas — API dinâmica (uid no externalReference) ou link estático. */
export async function startAsaasCheckout(
  planId: LunaPlanId,
  period: BillingPeriod,
  cpfCnpj: string,
): Promise<CheckoutResult> {
  if (planId !== 'plus' && planId !== 'pro' && planId !== 'byok') {
    return { ok: false, error: 'Plano sem checkout.' }
  }

  if (isLunaServerBridgeAvailable()) {
    try {
      const headers = await getLunarAuthHeaders()
      const res = await fetch(`${lunaServerBaseUrl()}/v1/billing/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ planId, period, cpfCnpj }),
      })
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string }
      if (res.ok && data.ok && data.url) {
        return { ok: true, url: data.url, source: 'api' }
      }
      if (data.error) {
        return { ok: false, error: data.error }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Checkout indisponível.'
      return { ok: false, error: msg }
    }
  }

  const links = getAsaasCheckoutLinks(planId)
  const url = period === 'annual' ? links.annual : links.monthly
  if (!url) {
    return { ok: false, error: 'Link de pagamento não configurado.' }
  }
  return { ok: true, url, source: 'link' }
}

type SyncResult = { ok: boolean; plan?: string; error?: string; ignored?: boolean }

type TrialSyncResult = {
  ok: boolean
  started?: boolean
  expired?: boolean
  active?: boolean
  trialEndsAt?: string
  skipped?: boolean
  reason?: string
  error?: string
}

/** Inicia trial Pro (7d) ou expira se vencido — só no servidor. */
export async function syncTrialBilling(): Promise<TrialSyncResult> {
  if (!isLunaServerBridgeAvailable()) {
    return { ok: false, error: 'Servidor Luna indisponível.' }
  }
  try {
    const headers = await getLunarAuthHeaders()
    if (!headers.Authorization) return { ok: false, skipped: true }
    const res = await fetch(`${lunaServerBaseUrl()}/v1/billing/trial/sync`, {
      method: 'POST',
      headers,
    })
    return (await res.json()) as TrialSyncResult
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Trial indisponível.',
    }
  }
}

type CreditPackResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

/** Checkout one-shot — pack +500 turns (R$9). */
export async function startCreditPackCheckout(
  cpfCnpj: string,
): Promise<CreditPackResult> {
  if (!isLunaServerBridgeAvailable()) {
    return { ok: false, error: 'Servidor Luna indisponível.' }
  }
  try {
    const headers = await getLunarAuthHeaders()
    const res = await fetch(`${lunaServerBaseUrl()}/v1/billing/credit-pack`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ cpfCnpj }),
    })
    const data = (await res.json()) as { ok?: boolean; url?: string; error?: string }
    if (res.ok && data.ok && data.url) {
      return { ok: true, url: data.url }
    }
    return { ok: false, error: data.error ?? 'Checkout indisponível.' }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Checkout indisponível.',
    }
  }
}

type DeleteAccountResult = { ok: boolean; error?: string }

/** Remove conta Lunar e todos os dados na nuvem. */
export async function deleteLunarAccount(): Promise<DeleteAccountResult> {
  if (!isLunaServerBridgeAvailable()) {
    return { ok: false, error: 'Servidor Luna indisponível.' }
  }
  try {
    const headers = await getLunarAuthHeaders()
    const res = await fetch(`${lunaServerBaseUrl()}/v1/account/delete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ confirm: true }),
    })
    return (await res.json()) as DeleteAccountResult
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Exclusão indisponível.',
    }
  }
}

/** Reconcilia plano com cobranças pagas no Asaas (webhook perdido / sandbox). */
export async function syncAsaasBilling(): Promise<SyncResult> {
  if (!isLunaServerBridgeAvailable()) {
    return { ok: false, error: 'Servidor Luna indisponível.' }
  }
  try {
    const headers = await getLunarAuthHeaders()
    if (!headers.Authorization) return { ok: false, ignored: true }
    const res = await fetch(`${lunaServerBaseUrl()}/v1/billing/sync`, {
      method: 'POST',
      headers,
    })
    const data = (await res.json()) as SyncResult
    return data
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Sync indisponível.',
    }
  }
}
