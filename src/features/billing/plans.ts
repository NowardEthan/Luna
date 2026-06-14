import type { LunaPlanId } from '../../lib/firebase/entitlements'

export interface PlanFeature {
  label: string
  available: boolean | 'limited'
  detail?: string
}

export interface PlanConfig {
  id: LunaPlanId
  name: string
  tagline: string
  priceMonthly: number
  priceAnnual: number | null
  priceAnnualMonthly: number | null
  cloudTurns: number | null  // null = chave própria (BYOK)
  features: PlanFeature[]
  highlighted?: boolean
  badge?: string
  asaasLinkMonthly: string
  asaasLinkAnnual: string
}

export const PLANS: PlanConfig[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Comece sem compromisso',
    priceMonthly: 0,
    priceAnnual: null,
    priceAnnualMonthly: null,
    cloudTurns: 20,
    asaasLinkMonthly: '',
    asaasLinkAnnual: '',
    features: [
      { label: 'Local ilimitado', available: true },
      { label: 'Luna Forge', available: true },
      { label: 'Créditos cloud', available: 'limited', detail: '20 trial' },
      { label: 'Add-ons', available: 'limited', detail: '20 req/mês' },
      { label: 'Memória cloud', available: false },
      { label: 'Agentes', available: false },
      { label: 'Review loops', available: false },
      { label: 'Orquestrador', available: false },
    ],
  },
  {
    id: 'plus',
    name: 'Luna Plus',
    tagline: 'Uso diário com cloud leve',
    priceMonthly: 25,
    priceAnnual: 250,
    priceAnnualMonthly: 20.83,
    cloudTurns: 1500,
    asaasLinkMonthly: '',
    asaasLinkAnnual: '',
    features: [
      { label: 'Local ilimitado', available: true },
      { label: 'Luna Forge completo', available: true },
      { label: 'Créditos cloud', available: true, detail: '1.500/mês' },
      { label: 'Add-ons ilimitados', available: true },
      { label: 'Memória cloud', available: true },
      { label: '1 agente simples', available: true },
      { label: 'Review loops', available: false },
      { label: 'Orquestrador', available: false },
    ],
  },
  {
    id: 'pro',
    name: 'Luna Pro',
    tagline: 'Para devs que usam a fundo',
    priceMonthly: 49,
    priceAnnual: 490,
    priceAnnualMonthly: 40.83,
    cloudTurns: 5000,
    highlighted: true,
    badge: 'Recomendado',
    asaasLinkMonthly: '',
    asaasLinkAnnual: '',
    features: [
      { label: 'Local ilimitado', available: true },
      { label: 'Luna Forge completo', available: true },
      { label: 'Créditos cloud', available: true, detail: '5.000/mês' },
      { label: 'Add-ons ilimitados', available: true },
      { label: 'Memória cloud', available: true },
      { label: 'Agentes completos', available: true },
      { label: 'Review loops', available: true },
      { label: 'Orquestrador multi-modelo', available: true },
    ],
  },
  {
    id: 'byok',
    name: 'Luna BYOK',
    tagline: 'Traga seu próprio modelo',
    priceMonthly: 12,
    priceAnnual: 120,
    priceAnnualMonthly: 10,
    cloudTurns: null,
    asaasLinkMonthly: '',
    asaasLinkAnnual: '',
    features: [
      { label: 'Local ilimitado', available: true },
      { label: 'Luna Forge completo', available: true },
      { label: 'Créditos cloud', available: true, detail: 'Chave própria' },
      { label: 'Add-ons ilimitados', available: true },
      { label: 'Memória cloud', available: true },
      { label: 'Agentes completos', available: true },
      { label: 'Review loops', available: true },
      { label: 'Orquestrador multi-modelo', available: true },
    ],
  },
]

export function getPlan(id: LunaPlanId): PlanConfig {
  return PLANS.find((p) => p.id === id) ?? PLANS[0]
}

export const PLAN_DISPLAY_LABELS: Record<LunaPlanId, string> = {
  free: 'Free',
  plus: 'Plus',
  pro: 'Pro',
  byok: 'BYOK',
  team: 'Team',
}
