# Firebase na Luna

A Luna mantém-se **local-first**: conversas, RAG e memória continuam no dispositivo até activar sincronização (`VITE_LUNA_CLOUD_SYNC=1`, ainda em desenvolvimento). O Firebase prepara autenticação, catálogo remoto da loja e futura sync na nuvem.

## Serviços recomendados

| Serviço | Uso na Luna |
|---------|-------------|
| **Authentication** | Google (produção); anónimo opcional em dev |
| **Firestore** | Perfil, conversas, memórias, definições |
| **Storage** | Pacotes `.zip` de plugins da marketplace |
| **Hosting** | JSON estático do catálogo (`marketplace-catalog.json`) |
| **Cloud Functions** | Proxy de APIs com segredos (nunca no renderer) |
| **App Check** | Proteger Auth/Firestore em produção |

## 1. Criar projeto

1. [Firebase Console](https://console.firebase.google.com/) → novo projeto.
2. Adicionar app **Web** e copiar o objeto de configuração.
3. Em **Authentication** → activar **Google** (e **Anónimo** só se usar `VITE_LUNA_CLOUD_ANON=1`).
4. Criar base **Firestore** (modo produção) e **Storage**.

## 2. Variáveis no `.env`

Guia passo a passo: **[firebase-cole-aqui.md](./firebase-cole-aqui.md)**.

Copie de `.env.example` (só 3 campos obrigatórios):

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_APP_ID=

# Opcional
VITE_FIREBASE_MEASUREMENT_ID=
VITE_LUNA_MARKETPLACE_CATALOG_URL=https://seu-projeto.web.app/marketplace-catalog.json
VITE_LUNA_CLOUD_SYNC=0
VITE_LUNA_CLOUD_ANON=0
VITE_FIREBASE_USE_EMULATORS=0
```

Reinicie `npm run dev` após alterar o `.env`.

## 3. Regras e emuladores

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules,storage
```

Emuladores locais:

```bash
firebase emulators:start
```

Com `VITE_FIREBASE_USE_EMULATORS=1`, o cliente liga Auth (9099), Firestore (8080) e Storage (9199).

## 4. Catálogo e add-ons remotos

O catálogo embutido em `src/data/marketplace-catalog.json` fica vazio por defeito. O **Luna IDE** não vem na instalação nativa — publica-se à parte:

```bash
# Empacota, envia o .zip ao Storage e actualiza o catálogo local
npm run addon:publish-ide
npm run firebase:deploy-catalog
```

Ou passo a passo: `addon:pack-ide` → `addon:upload-ide` (requer `chaves/*firebase-adminsdk*.json`) → `firebase:deploy-catalog`.

`firebase:deploy-catalog` gera `public/marketplace-catalog.json` a partir do `.env` e faz deploy no Hosting. Defina `VITE_LUNA_MARKETPLACE_CATALOG_URL` (ou use o URL por defeito `https://{PROJECT_ID}.web.app/marketplace-catalog.json`).

Regras de leitura pública: `storage.rules` → `marketplace/plugins/{pluginId}/**`.

Alternativa futura: coleção `marketplaceCatalog/listings` (ver `firestore.rules`).

## 5. Login Google

### Electron (recomendado — igual ao projeto Luna)

1. Clica **Entrar com Google** → abre o **browser do sistema** (Chrome/Edge).
2. O callback local é `http://127.0.0.1:5167/auth-landing` (`electron/googleOAuth.cjs`).
3. A app recebe o `id_token` e faz `signInWithCredential` no Firebase.

No [Google Cloud Console](https://console.cloud.google.com/) → APIs → Credenciais → cliente OAuth **Web** do Firebase, adiciona em **URIs de redirecionamento autorizados**:

`http://127.0.0.1:5167/auth-landing`

Usa o **mesmo Web client OAuth** que o projeto Luna (`529601808898-…`, já no código). Opcional: `GOOGLE_OAUTH_WEB_CLIENT_ID` no `.env` para sobrescrever.

### Firestore «Missing or insufficient permissions»

O Luna não versiona `firestore.rules`; o New App tinha regras mais restritivas (`isLunarAccount`). As regras foram alinhadas ao padrão **só dono autenticado**. Publica uma vez:

```bash
npm run firebase:deploy-rules
```

### Browser (Vite)

`signInWithPopup` na janela principal. Em **Authentication → Authorized domains**: `127.0.0.1` e `localhost`.

### Hosting (`init.json`)

Só necessário se usares redirect Firebase no browser contra `firebaseapp.com`. Publicar: `npm run firebase:deploy-catalog`.

## 6. Segurança

- Chaves `VITE_FIREBASE_*` são **públicas** por desenho; restrinja com regras Firestore/Storage e App Check.
- **Nunca** coloque `GROQ_API_KEY`, `OPENROUTER_API_KEY`, etc. no frontend — use Cloud Functions ou o servidor Luna existente.

## Código relevante

- `src/lib/firebase/` — cliente modular (app, auth, firestore, storage)
- `src/lib/lunaCloud.ts` — flags de funcionalidades
- `src/features/auth/AuthProvider.tsx` — sessão na UI
- Definições → **Conta e nuvem**
