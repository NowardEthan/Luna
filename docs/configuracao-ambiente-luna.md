# Configuração de ambiente — Luna / Orbit

Guia rápido para preencher chaves e alternar **local** ↔ **cloud**.

---

## 1. O que vai onde

| Ficheiro | O quê |
|----------|--------|
| `luna-core/.env` | LLM do **chat Luna Core** (pipeline PAIA) |
| `Orbit/.env` | IDE agente, Firebase, Asaas, RAG, etc. |
| `Orbit/.env` → `LUNA_CORE_PATH` | Caminho para o pacote Core |

---

## 2. Perfis prontos (recomendado)

No Orbit:

```bash
npm run luna-env:local    # LM Studio — ilimitado, sem cota cloud
npm run luna-env:cloud    # Groq — testa metering P3
```

Isto faz **merge** nos `.env` existentes (não apaga Firebase, Asaas, etc.).

Templates em:
- `luna-core/env.profiles/local.env` · `cloud-groq.env`
- `Orbit/env.profiles/local.env` · `cloud-groq.env`

### Local (LM Studio)

1. Abre LM Studio → carrega **Qwen2.5-VL-7B** (ou outro)
2. Liga **Local Server** (porta `1234`)
3. `npm run luna-env:local`
4. `npm run luna-core:build` (se ainda não fizeste)
5. `npm run dev`

### Cloud (Groq — cota P3)

1. Chave em https://console.groq.com/keys
2. `npm run luna-env:cloud`
3. Se o script avisar, confirma que `LUNA_API_KEY` e `GROQ_API_KEY` estão no `.env` (o merge **preserva** chaves que já tinhas)
4. Reinicia o Orbit
5. Conta Lunar + aba **Uso** → turns sobem após cada mensagem cloud

---

## 3. Chaves que **tu** preenches

### Obrigatório para Conta Lunar / billing

| Variável | Onde | Como obter |
|----------|------|------------|
| `VITE_FIREBASE_*` | Orbit `.env` | `docs/firebase-cole-aqui.md` |
| Regras Firestore | deploy | `firebase deploy --only firestore:rules` |

### Cloud LLM (opcional)

| Variável | Onde |
|----------|------|
| `LUNA_API_KEY` | `luna-core/.env` |
| `GROQ_API_KEY` | `Orbit/.env` (agente IDE) |

### Asaas (P4 — pagamentos)

| Variável | Uso |
|----------|-----|
| `ASAAS_API_KEY` | Checkout API + consultas Asaas |
| `ASAAS_ENV` | `sandbox` ou `production` |
| `ASAAS_WEBHOOK_TOKEN` | Header `asaas-access-token` no webhook |
| `ASAAS_WEBHOOK_ALLOW_OPEN` | `1` só em dev local sem token |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Webhook escreve `users/{uid}.plan` |
| `VITE_ASAAS_LINK_*` | Fallback se API indisponível |

**Webhook (painel Asaas):**
- Dev rápido: ngrok → `localhost:39281`
- Já preparado: **Railway** — ver [`deploy-railway.md`](./deploy-railway.md)
- URL: `POST …/v1/billing/webhook/asaas`

**Checkout:** com `ASAAS_API_KEY`, o botão **Assinar** chama `POST /v1/billing/checkout` e abre o link com `externalReference=luna:{uid}:{plan}:{period}`.

Cria links estáticos no painel Asaas → **Links de pagamento** (Plus/Pro/BYOK × mensal/anual) e cola em:

```env
VITE_ASAAS_LINK_PLUS_MONTHLY=https://...
VITE_ASAAS_LINK_PRO_MONTHLY=https://...
# etc.
```

### Outros (opcional)

| Variável | Serviço |
|----------|---------|
| `TAVILY_API_KEY` | Pesquisa web |
| `GOOGLE_TRANSLATE_API_KEY` | Tradução reasoning |
| `OPENROUTER_API_KEY` | Fallback LLM |

---

## 4. Checklist rápido

```
[ ] LUNA_CORE_PATH no Orbit/.env
[ ] npm run luna-core:build
[ ] Perfil local OU cloud aplicado
[ ] LM Studio a correr (se local)
[ ] Firebase configurado (se quiser sync + metering)
[ ] firestore.rules deployadas
[ ] Links Asaas no .env (quando tiveres os URLs)
```

---

## 5. Comportamento billing (P3)

| Core `LUNA_API_BASE` | Cota cloud |
|----------------------|------------|
| `localhost` / `127.0.0.1` | Não consome |
| Groq / OpenAI / etc. | Consome turns |
| Cota 100% | Fallback automático → local |

---

*Ver também: [`modelo-comercial-luna.md`](./modelo-comercial-luna.md) · [`roadmap-billing-assinaturas.md`](./roadmap-billing-assinaturas.md)*
