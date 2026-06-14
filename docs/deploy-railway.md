# Deploy Luna API — Railway

Guia para publicar o backend Python (`backend/`) no [Railway](https://railway.com), substituindo ngrok em desenvolvimento e servindo billing + API em produção.

---

## O que corre no Railway

| Rota | Uso |
|------|-----|
| `GET /health` | Healthcheck Railway |
| `POST /v1/billing/checkout` | Assinar plano (Orbit) |
| `POST /v1/billing/sync` | Reconciliar plano após pagamento |
| `POST /v1/billing/webhook/asaas` | Webhook Asaas → Firestore |
| `POST /v1/llm/*` | Opcional — LLM cloud no servidor |

O **Orbit desktop** continua a correr localmente; em produção aponta para a URL Railway via `LUNA_SERVER_URL`.

---

## 1. Criar o serviço

1. [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo** (Orbit)
2. **Settings → Root Directory:** `backend`
3. Railway detecta `Dockerfile` + `railway.toml`
4. **Settings → Networking → Generate Domain**  
   Ex.: `https://luna-api-production.up.railway.app`

---

## 2. Variáveis no Railway

Copia de `env.profiles/railway.env.example`. Mínimo para billing:

| Variável | Valor |
|----------|--------|
| `LUNA_DEPLOY_MODE` | `railway` |
| `ASAAS_API_KEY` | chave sandbox (agora) ou produção (lançamento) |
| `ASAAS_ENV` | `sandbox` ou `production` |
| `ASAAS_WEBHOOK_TOKEN` | token do painel Asaas |
| `ASAAS_WEBHOOK_ALLOW_OPEN` | `0` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON da service account (uma linha) |

**Firebase no Railway:** Firebase Console → Project Settings → Service accounts → Generate new private key → copia o JSON completo para a variável `FIREBASE_SERVICE_ACCOUNT_JSON` (sem ficheiro no disco).

Opcional (LLM no servidor):

| Variável | Valor |
|----------|--------|
| `GROQ_API_KEY` | chave Groq |

---

## 3. Webhook Asaas

No painel Asaas (sandbox agora, produção no lançamento):

**Integrações → Webhooks → Adicionar**

| Campo | Valor |
|-------|--------|
| URL | `https://SEU-DOMINIO.up.railway.app/v1/billing/webhook/asaas` |
| Token | igual a `ASAAS_WEBHOOK_TOKEN` no Railway |
| Eventos | `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `SUBSCRIPTION_DELETED` |

Teste:

```bash
curl -s https://SEU-DOMINIO.up.railway.app/health
```

---

## 4. Orbit — dev vs produção

### Agora (dev local + ngrok OU Railway)

| Modo | Config |
|------|--------|
| ngrok (teste rápido) | `ngrok http 39281` + webhook → URL ngrok |
| Railway (já preparado) | Webhook → URL Railway; app ainda pode usar `localhost:39281` para LLM |

### No lançamento (app aponta para Railway)

No `.env` do build Electron / distribuição:

```env
LUNA_SERVER_URL=https://luna-api-production.up.railway.app
LUNA_USE_SERVER=1
```

O utilizador **não** precisa de ngrok nem de servidor Python local para billing.

---

## 5. Sandbox → produção (lançamento)

1. Conta Asaas **produção** verificada
2. Novas chaves: `ASAAS_ENV=production`, `ASAAS_API_KEY` produção
3. Novo webhook no painel **produção** (mesma URL Railway)
4. `firebase deploy --only firestore:rules` se ainda não fez

Conta Asaas **separada** da app Nexus (evita cruzar cobranças).

---

## 6. Domínio próprio (opcional)

Railway → Settings → Custom Domain → `api.lunacloud.com`  
Atualiza webhook Asaas e `LUNA_SERVER_URL` no app.

---

## 7. Checklist

```
[ ] Deploy Railway OK — /health 200
[ ] FIREBASE_SERVICE_ACCOUNT_JSON configurado
[ ] ASAAS_* configurado
[ ] Webhook Asaas → URL Railway (sem ngrok)
[ ] Teste checkout → pagamento sandbox → plano no Firestore
[ ] firestore.rules deployadas
[ ] LUNA_SERVER_URL no build do app (quando lançar)
```

---

*Ver também: [`configuracao-ambiente-luna.md`](./configuracao-ambiente-luna.md) · [`roadmap-billing-assinaturas.md`](./roadmap-billing-assinaturas.md)*
