# Roadmap — Billing & Assinaturas Luna

> Implementação do modelo comercial no Orbit.
> **Base existente:** Firebase Auth ✅ · Firestore sync ✅ · Planos definidos ✅ · Entitlements ✅ · Asaas configurado ✅

---

## Status das fases

```
P1  UI dos Planos          ██████████████████████  CONCLUÍDO
P2  Fundação de planos     ██████████████████████  CONCLUÍDO
P3  Enforcement pipeline   ██████████████████████  CONCLUÍDO
P4  Asaas + pagamento      ██████████████████████  CONCLUÍDO
P5  BYOK                   ██████████████████████  CONCLUÍDO
P6  Polish + mockups reais ░░░░░░░░░░░░░░░░░░░░░░  pendente
```

---

## P1 — UI dos Planos ✅ CONCLUÍDO

**O que foi feito:**

| Componente / Arquivo | Status |
|---|---|
| `src/features/billing/plans.ts` | ✅ 4 planos definidos (Free/Plus/Pro/BYOK) |
| `src/features/billing/PlanCard.tsx` | ✅ Card com preço, features, CTA |
| `src/features/billing/PlanBadge.tsx` | ✅ Badge "Ver planos" / nome do plano na StatusBar |
| `src/features/billing/BillingModal.tsx` | ✅ (legado — integrado ao AccountModal) |
| `src/lib/firebase/entitlements.ts` | ✅ `LunaPlanId`: `free \| plus \| pro \| byok \| team` |
| `src/features/auth/LunarGateScreen.tsx` | ✅ Modal unificado com 4 tabs (Conta/Uso/Planos/Cloud) |
| `src/features/auth/LunarAccountModal.tsx` | ✅ Redesign: close absoluto, tamanho xl |
| `src/features/auth/LunarAccountSignIn.tsx` | ✅ Redesign: brand + 3 bullets de valor |
| `src/components/StatusBar.tsx` | ✅ PlanBadge visível para todos os planos |

**Mockups implementados (dados estáticos — tornar reais nas fases seguintes):**

| Feature | Onde | Fase para tornar real |
|---|---|---|
| Mini usage bar na sidebar do AccountModal | `LunarGateScreen` sidebar | P2 |
| Aba Uso: progress bar, breakdown por complexidade | `LunarGateScreen` UsageTab | P2 + P3 |
| Histórico mensal (últimos 3 meses) | `LunarGateScreen` UsageTab | P6 |
| Pack de créditos CTA | `LunarGateScreen` UsageTab | P6 |
| "Renova em X dias" | `LunarGateScreen` UsageTab | P2 |
| "Uso atual" no topo da aba Planos | `LunarGateScreen` PlanosTab | P2 |
| Provedores BYOK conectados | `LunarGateScreen` UsageTab BYOK | P5 |
| O que é sincronizado (Cloud tab) | `LunarGateScreen` CloudTab | Futuro |
| Excluir conta (Conta tab) | `LunarGateScreen` ContaTab | Futuro |

---

## P2 — Fundação de planos e metering ✅ CONCLUÍDO

**Objetivo:** Substituir todos os dados mockados de uso por dados reais do Firestore. O contador de turns ainda não incrementa aqui (isso é P3), mas a estrutura de leitura estará pronta.

**Entregue:**

| Item | Arquivo | Status |
|---|---|---|
| Quota map | `lunarPlanQuotas.ts` | ✅ |
| Hook de uso | `useLunaUsage.ts` | ✅ `onSnapshot` + `loading` |
| Path helper | `paths.ts` → `userUsageDoc` | ✅ |
| Wiring UI | `LunarGateScreen.tsx` | ✅ UsageTab / PlanosTab / sidebar |
| Regras Firestore | `firestore.rules` → `usage/{monthKey}` | ✅ read owner · write bloqueado (P3 admin) |
| Loading skeleton | `LunarGateScreen` + `Skeleton` | ✅ |

**Mock intencional (P6):** histórico 3 meses · provedores BYOK · pack avulso.

---

## P3 — Enforcement no pipeline ✅ CONCLUÍDO

**Objetivo:** Verificar cota antes do pipeline cloud. Incrementar contador após sucesso. Fallback local a 100% — nunca bloquear.

**Entregue:**

| Item | Arquivo | Status |
|---|---|---|
| Política cloud vs local | `lunaCloudTurnPolicy.ts` | ✅ |
| Incremento Firestore | `recordCloudTurn.ts` | ✅ |
| Breakdown tálamo | `mapPipelineBreakdown.ts` | ✅ |
| Hook billing turno | `useLunaCoreBilling.ts` | ✅ |
| Bridge: cota + fallback | `lunaCoreBridge.cjs` | ✅ `forceLocal` + `billingMeta` |
| Turno chat + IDE | `lunaCoreTurnShared.ts` | ✅ |
| Avisos 70/90/100% | `SimpleChatComposer` + `AppShell` | ✅ |
| Regras Firestore write | `firestore.rules` | ✅ increment +1 owner |

**Comportamento:**
- Core local (LM Studio) → não consome cota
- BYOK → ilimitado
- Cota esgotada → pipeline com config local + aviso na resposta
- Turno cloud OK → `recordCloudTurn` + breakdown

---

## P4 — Asaas + pagamento ✅ CONCLUÍDO

**Objetivo:** Checkout funcional. Webhook atualiza plano no Firestore.

**Entregue:**

| Item | Arquivo | Status |
|---|---|---|
| Client Asaas | `backend/luna/billing/asaas.py` | ✅ customer + subscription + invoiceUrl |
| Webhook handler | `backend/luna/billing/webhook.py` | ✅ `POST /v1/billing/webhook/asaas` |
| Plan updater | `backend/luna/billing/plan_updater.py` | ✅ Admin SDK → `users/{uid}` |
| Checkout API | `app.py` → `POST /v1/billing/checkout` | ✅ `externalReference=luna:{uid}:{plan}:{period}` |
| UI checkout | `billingApi.ts` + `LunarGateScreen` | ✅ API ou link estático |
| Perfil tempo real | `AuthProvider` onSnapshot | ✅ plan + billing |
| Regras Firestore | `firestore.rules` | ✅ cliente não escreve plan/billing |

**Webhooks:**

| Evento | Ação |
|---|---|
| `PAYMENT_CONFIRMED` | `plan = 'plus' \| 'pro' \| 'byok'`, entitlements atualizados |
| `PAYMENT_OVERDUE` | UI warning (não cancela) |
| `PAYMENT_DELETED` | `plan = 'free'` |
| `SUBSCRIPTION_DELETED` | `plan = 'free'` |

**Fluxo:**
```
[Assinar] → shell.openExternal(asaasLink)
→ usuário paga (PIX/boleto/cartão)
→ Asaas webhook → backend → Firestore plan
→ Orbit onSnapshot → desbloqueia features em tempo real
```

**P4 também desbloqueia:**
- "Renova em X dias" real (lido do Asaas ou da assinatura no Firestore)
- "Próxima cobrança: R$49 em DD/MM" na aba Planos

---

## P5 — BYOK (Bring Your Own Key) ✅ CONCLUÍDO

**Objetivo:** Usuário conecta sua própria chave. Pipeline usa essa chave em vez da cloud Luna. Provedores conectados na aba Uso ficam reais.

**Entregue:**

| Item | Arquivo | Status |
|---|---|---|
| Cofre local (safeStorage) | `electron/byokVault.cjs` | ✅ chaves encriptadas no dispositivo |
| IPC test/save/delete | `electron/byokHandlers.cjs` | ✅ |
| Bridge pipeline BYOK | `lunaCoreBridge.cjs` | ✅ `byokUid` + `byokMeta` |
| API renderer | `ApiKeyVault.ts` | ✅ |
| Metadados Firestore | `byokFirestore.ts` → `users/{uid}/byok/config` | ✅ sem chave em texto |
| Hook | `useByokConfig.ts` | ✅ |
| Setup modal | `ByokSetupModal.tsx` | ✅ testar + salvar |
| Selector | `ByokProviderSelector.tsx` | ✅ |
| Turno Core | `useLunaCoreBilling.ts` + `lunaCoreTurnShared.ts` | ✅ |
| UI Uso | `LunarGateScreen` UsageTab | ✅ real |
| Regras Firestore | `byok/{docId}` | ✅ |

**Provedores:** OpenAI · Groq · Together · Gemini · Claude (OpenRouter) · LM Studio · Ollama

**Nota:** segredos ficam no keychain do Electron; Firestore guarda só provedor activo, modelos e `keyHint`.

---

## P6 — Polish + implementar mockups restantes ✅

**Objetivo:** Experiência completa, sem arestas. Todos os dados mockados tornam-se reais.

| Feature | Detalhe | Status |
|---|---|---|
| Trial 7 dias Pro | `POST /v1/billing/trial/sync` → `plan=pro`, `trialEndsAt`, expira → free | ✅ |
| Planos anuais | Checkout API `period=annual` + links estáticos | ✅ (P4) |
| Pack avulso | `POST /v1/billing/credit-pack` → +500 `bonusTurns` no mês | ✅ |
| Histórico mensal real | `useLunaUsageHistory` — últimos 3 meses Firestore | ✅ |
| Emails transacionais | Boas-vindas, trial expirando, cota 90% | ⏳ deferido |
| Excluir conta | `POST /v1/account/delete` + UI ContaTab | ✅ |
| Toggles sync cloud | `users/{uid}/settings/sync` + CloudTab | ✅ |
| "Renova em X dias" | `billing.nextDueDate` Asaas | ✅ (P4) |

---

## Ordem de implementação

```
P1 ✅ → P2 ✅ → P3 ✅ → P4 ✅ → P5 ✅ → P6 ✅
              ↑         ↑
         depende P2  depende P4
```

P2 e P4 podem andar em paralelo.
P3 depende de P2 (precisa da estrutura do doc Firestore).
P5 depende de P4 (plano BYOK precisa existir no sistema).
P6 é sempre por último.

---

## Arquivos ao final de todas as fases

```
src/features/billing/
  plans.ts                  ✅
  PlanCard.tsx              ✅
  PlanBadge.tsx             ✅
  BillingModal.tsx          ✅ (legado)
  lunarPlanQuotas.ts        ✅
  useLunaUsage.ts           ✅
  useLunaUsageHistory.ts    ✅
  ApiKeyVault.ts            ✅
  ByokSetupModal.tsx        ✅
  ByokProviderSelector.tsx  ✅
  byokProviders.ts          ✅
  byokFirestore.ts          ✅
  useByokConfig.ts          ✅

src/lib/firebase/
  paths.ts                  ✅ (userUsageDoc)

backend/luna/billing/
  asaas.py                  ✅
  webhook.py                ✅
  plan_updater.py           ✅
  trial.py                  ✅
  usage_bonus.py            ✅
  account_delete.py         ✅

src/features/billing/
  billingApi.ts             ✅
  parseBilling.ts           ✅

src/features/sync/
  useSyncPreferences.ts     ✅
```

---

*Última atualização: 2026-06-09*
