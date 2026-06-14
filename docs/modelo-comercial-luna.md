# Modelo Comercial — Luna

> Documento de definição do modelo de negócio da Luna.
> **Versão:** 1.0 · **Data:** 2026-06-09

---

## 1. Filosofia

A Luna não compete com Claude Code tentando ter "um modelo melhor". A vantagem está em ser uma arquitetura modular, local-first e multi-modelo, onde o modelo é apenas um motor substituível dentro do Core.

> **Claude Code melhora quando o modelo melhora. Luna melhora quando qualquer parte do sistema melhora.**

**Princípios comerciais:**
- Preço para adoção, não para margem máxima
- Local-first: o produto funciona sem pagar nada
- Cloud como potência extra, não como requisito
- O Core é o produto. O modelo é o motor.

---

## 2. Posicionamento de mercado

| Produto | Preço mensal |
|---------|-------------|
| GitHub Copilot Pro | ~R$50 |
| Windsurf Pro | ~R$75 |
| Cursor Pro | ~R$100 |
| Claude Code Pro | ~R$100 |
| **Luna Plus** | **R$25** |
| **Luna Pro** | **R$49** |
| **Luna BYOK** | **R$12** |

- Luna Plus = 50% abaixo do Copilot
- Luna Pro = 51% abaixo do Cursor
- Luna BYOK = sem paralelo no mercado

> **Frase comercial:** *"Claude vende um motor muito forte. Luna vende uma oficina inteira, onde qualquer motor trabalha melhor."*

---

## 3. Os 4 tiers

### Free — R$0

| Feature | Disponibilidade |
|---------|----------------|
| Local ilimitado (LM Studio/Ollama) | ✅ |
| Luna Forge (com modelos locais) | ✅ |
| Créditos cloud | 20 (trial único, não renova) |
| Add-ons | 20 requisições/mês |
| Memória cloud sincronizada | ❌ |
| Agentes | ❌ |
| Review loops | ❌ |

---

### Luna Plus — R$25/mês · R$250/ano

| Feature | Disponibilidade |
|---------|----------------|
| Local ilimitado | ✅ |
| Créditos cloud | 1.500/mês (~50/dia) |
| Luna Forge completo | ✅ |
| Memória Core cloud | ✅ |
| Add-ons | ✅ ilimitado |
| Agentes | 1 simples |
| Review loops | ❌ |
| Orquestrador multi-modelo | ❌ |

---

### Luna Pro — R$49/mês · R$490/ano

| Feature | Disponibilidade |
|---------|----------------|
| Local ilimitado | ✅ |
| Créditos cloud | 5.000/mês (~165/dia) |
| Luna Forge completo | ✅ |
| Memória Core cloud | ✅ |
| Add-ons | ✅ ilimitado |
| Agentes | ✅ completo |
| Review loops | ✅ |
| Orquestrador multi-modelo | ✅ |
| Prioridade de fila cloud | ✅ |

---

### Luna BYOK — R$12/mês · R$120/ano

Usuário conecta sua própria chave de API. A Luna cobra pelo ecossistema, não pelo modelo.

| Feature | Disponibilidade |
|---------|----------------|
| Local ilimitado | ✅ |
| Créditos cloud | — (usa tokens da chave própria) |
| Luna Forge completo | ✅ |
| Memória Core cloud | ✅ |
| Add-ons | ✅ ilimitado |
| Agentes + review loops | ✅ |
| Orquestrador multi-modelo | ✅ |

**Provedores suportados:** Claude, OpenAI, Gemini, Groq, Together, LM Studio, Ollama

> *"Você escolhe o motor. Luna organiza a oficina."*

---

## 4. Desconto anual

2 meses grátis em todos os tiers pagos:

| Tier | Mensal | Anual | Equivalente/mês |
|------|--------|-------|-----------------|
| Plus | R$25 | R$250 | R$20,83 |
| Pro | R$49 | R$490 | R$40,83 |
| BYOK | R$12 | R$120 | R$10,00 |

---

## 5. Trial

- **7 dias de Pro grátis** no cadastro
- Sem necessidade de cartão (definir na implementação)
- Ao fim do trial → Free automaticamente
- O produto continua funcionando (fallback para local)

---

## 6. Sistema de créditos

### O que o usuário vê

O usuário **nunca vê tokens**. O sistema de créditos é abstraído:

- **Barra mensal:** `"Uso avançado: 68% — renova em 12 dias"`
- **Badge por ação:** `Baixo` · `Moderado` · `Alto` · `Profundo`
- **Confirmação:** `"Essa tarefa tem impacto alto no seu plano. Continuar?"`

### Alertas

| Uso | Comportamento |
|-----|--------------|
| 70% | Aviso sutil no composer |
| 90% | Aviso destacado + opção de pack avulso |
| 100% | Fallback automático para local — produto continua funcionando |

### Internamente

1 crédito = 1 turno do pipeline Luna (3 chamadas LLM: análise → memória → resposta).
Agent loops no Forge podem consumir múltiplos créditos por ação.

---

## 7. Pack avulso

- **R$9 por +500 créditos** (disponível para qualquer tier pago)
- Não acumula para o próximo mês
- Adquirível direto na UI quando atingir 90% da cota

---

## 8. Add-ons

Add-ons são módulos especializados que estendem o Core para domínios específicos.

| Add-on | Status |
|--------|--------|
| Luna Financeiro | ✅ disponível no lançamento |
| Luna Forge (IDE) | ✅ nativo em todos os tiers |
| Luna CNC/Marcenaria | 🔵 roadmap |
| Luna Estudos/ENEM | 🔵 roadmap |
| Luna Gestão de Projeto | 🔵 roadmap |

**No Free:** 20 requisições de add-on por mês (para experimentar).
**No Plus/Pro/BYOK:** ilimitado.

> *"Modelos são motores. Add-ons são máquinas. Luna é a oficina."*

---

## 9. Fora do lançamento

- Business/Team (por seat, workflows, auditoria, permissões)
- Luna Studio (orquestração multi-modelo pesada, R$149-299)
- Novos add-ons conforme ficarem prontos

---

## 10. Sustentabilidade

### Custos estimados (infra lean, solo dev)

- Auth + DB (Supabase): ~R$125/mês
- Cloud proxy (Fly.io/Railway): ~R$150/mês
- Stripe fees (~3%): variável
- Misc: ~R$75/mês
- **Total fixo: ~R$350-400/mês**

### Breakeven

| Meta | Só Plus | Só Pro | Mix realista |
|------|---------|--------|--------------|
| Cobrir infra (R$400) | 16 usuários | 9 usuários | ~12 usuários |
| Sustentabilidade (R$3.400) | 136 usuários | 70 usuários | ~90 usuários |

### Custo real por crédito (Groq/Together)

| Complexidade | Custo real/turno |
|---|---|
| Simples (8B local) | ~R$0,001 |
| Moderado (32B resposta) | ~R$0,008 |
| Complexo (70B resposta) | ~R$0,024 |
| **Média ponderada** | **~R$0,006** |

---

## 11. O que precisa ser construído (delta do Orbit atual)

O Orbit já tem Firebase Auth, Firestore sync, planos definidos e entitlements. O que falta:

| Item | Prioridade |
|------|-----------|
| Expandir `LunaPlanId`: `free \| plus \| pro \| byok` | Alta |
| Contador de créditos no Firestore (`users/{uid}/usage/YYYY-MM`) | Alta |
| Verificação de cota no pipeline antes de executar | Alta |
| Integração Asaas (link de pagamento + webhook → atualiza plano no Firestore) | Alta |
| UI de upgrade + barra de uso cloud | Alta |
| Key storage seguro para BYOK (encrypted no Firestore) | Média |
| Alerta em 70%/90%/100% | Média |
| Pack avulso (compra in-app) | Média |
| Dashboard de uso do usuário | Baixa |
| Trial automático de 7 dias Pro | Baixa |

---

## 12. Pagamento — Asaas

Plataforma escolhida: **Asaas** (suporte nativo a PIX, boleto e cartão — mercado brasileiro).

### Fluxo

```
Usuário clica "Upgrade" no Orbit
       ↓
Backend cria Customer + Subscription no Asaas (API)
       ↓
Usuário paga via PIX / boleto / cartão
       ↓
Asaas dispara webhook ao backend
       ↓
Backend valida → escreve users/{uid}.plan no Firestore
       ↓
Orbit lê plano atualizado → desbloqueia features
```

### Webhooks a tratar

| Evento Asaas | Ação no Firestore |
|---|---|
| `PAYMENT_CONFIRMED` | `plan = 'plus' \| 'pro' \| 'byok'` |
| `PAYMENT_OVERDUE` | Aviso de inadimplência na UI |
| `PAYMENT_DELETED` | `plan = 'free'` |
| `SUBSCRIPTION_DELETED` | `plan = 'free'` |

### Métodos de pagamento suportados

- PIX (recomendado — instantâneo, sem taxa relevante)
- Boleto bancário
- Cartão de crédito (recorrente)

---

*Última atualização: 2026-06-09*
