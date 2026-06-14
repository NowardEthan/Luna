# Firebase e Conta Lunar

## Conta Lunar vs offline

| Modo | O que funciona |
|------|----------------|
| **Offline** | Ollama, IDE local, RAG local (embed Ollama) |
| **Conta Lunar** | Modelos cloud hospedados no servidor Luna, sync Firestore, loja remota, pesquisa web |

Sem sessão Lunar, pedidos a modelos cloud devolvem **401** no servidor.

---

# Firebase — o que colar no `.env`

## Atalho (recomendado)

1. Coloca o JSON **Admin SDK** em `chaves/` (ex.: `*-firebase-adminsdk-*.json`).
2. Corre:

```bash
npm run firebase:sync-env
```

O script preenche automaticamente `VITE_FIREBASE_*` no `.env` e o `.firebaserc`.

---

## Manual (Console)

Só precisas de **3 valores** do Firebase Console se não usares o script acima.

## 1. Obter as chaves (2 minutos)

1. Abre [Firebase Console](https://console.firebase.google.com/) e cria (ou escolhe) um projeto.
2. Ícone de **engrenagem** → **Definições do projeto**.
3. Em **As tuas apps** → **Adicionar app** → **Web** (`</>`).
4. Regista a app (nome: `Luna`) e copia o bloco `firebaseConfig`:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "meu-projeto.firebaseapp.com",
  projectId: "meu-projeto",
  storageBucket: "meu-projeto.appspot.com",
  appId: "1:123456:web:abc...",
  measurementId: "G-XXXX"  // opcional
};
```

## 2. Colar no `.env`

No ficheiro `.env` na raiz do projeto, na secção **Firebase**:

| Variável no `.env` | Campo no `firebaseConfig` |
|--------------------|---------------------------|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_APP_ID` | `appId` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` (opcional) |
| `VITE_FIREBASE_MEASUREMENT_ID` | `measurementId` (opcional, Analytics) |

**Não é obrigatório** preencher `VITE_FIREBASE_AUTH_DOMAIN` nem `VITE_FIREBASE_STORAGE_BUCKET` — a Luna usa `{projectId}.firebaseapp.com` e `{projectId}.appspot.com` automaticamente.

Reinicia o dev server depois de guardar:

```bash
npm run dev
```

## 3. Activar Authentication

No Console → **Authentication** → **Começar**:

- **Google** — para login real na app.
- **Anónimo** — recomendado em dev enquanto testas (`VITE_LUNA_CLOUD_ANON=1` já está no `.env`).

## 4. Firestore e Storage (uma vez)

- **Firestore** → Criar base de dados (modo produção, região à tua escolha).
- **Storage** → Começar.

Depois, na raiz do projeto (com [Firebase CLI](https://firebase.google.com/docs/cli) instalado):

```bash
copy .firebaserc.example .firebaserc
# Edita .firebaserc e substitui COLE_O_SEU_PROJECT_ID pelo projectId real

firebase login
firebase deploy --only firestore:rules,storage
```

Ou usa os scripts npm: `npm run firebase:deploy-rules`

## 5. Catálogo da loja (Hosting)

O ficheiro `public/marketplace-catalog.json` é publicado no Hosting.

Em **produção**, com `projectId` no `.env`, a Luna usa automaticamente:

`https://{PROJECT_ID}.web.app/marketplace-catalog.json`

Com `VITE_FIREBASE_PROJECT_ID` no `.env`, a loja carrega o catálogo de `https://{PROJECT_ID}.web.app/marketplace-catalog.json` (após `npm run firebase:deploy-catalog`).

Para publicar:

```bash
npm run firebase:deploy-catalog
```

## 6. Verificar na app

1. **Definições** → **Conta e nuvem** → deve mostrar «Firebase: configurado».
2. **Entrar com Google** ou **Sessão anónima (dev)**.
3. **Loja** — catálogo remoto quando o Hosting estiver publicado.

## Resolução de problemas

| Sintoma | Solução |
|---------|---------|
| «Firebase: não configurado» | Falta `apiKey`, `projectId` ou `appId`; reinicia `npm run dev` |
| Popup Google bloqueado (Electron) | Testa em `npm run dev:web` ou autoriza popups |
| Auth anónima falha | Activa método **Anónimo** no Firebase Auth |
| Catálogo remoto vazio | Normal se `items: []`; publica Hosting ou edita o JSON |

Mais detalhe: [firebase-setup.md](./firebase-setup.md).
