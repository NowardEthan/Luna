# Pasta `chaves/`

Coloca aqui ficheiros de credenciais **locais** (não vão para o Git).

## Firebase

| Ficheiro | Uso |
|----------|-----|
| `*-firebase-adminsdk-*.json` | Conta de serviço **Admin** (servidor / scripts) |
| Config Web (`apiKey`, `appId`) | Gerada automaticamente no `.env` |

Depois de adicionar ou trocar o JSON Admin:

```bash
npm run firebase:sync-env
```

Isto actualiza `VITE_FIREBASE_*` no `.env` e o `.firebaserc`.

**Nunca** commits esta pasta nem copies a `private_key` para variáveis `VITE_*`.
