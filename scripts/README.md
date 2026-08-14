# Scripts administrativos (one-off)

Scripts pra mexer no Firestore com privilégios de admin. **NÃO** usar em produção
nem commitar o `serviceAccountKey.json`.

## set-owner-flag.js

Seta `isOwner: true` no doc `users/{uid}` — dá uso ilimitado de tokens naquela conta
(o Legacy lê esse campo via `onSnapshot` em [useLunaUsage.ts](../src/features/billing/useLunaUsage.ts)).

### Setup

1. Baixe o `serviceAccountKey.json` do Firebase Console:
   - **Project Settings → Service Accounts → Generate new private key**
   - Salve em qualquer lugar **fora do repo** (ex.: `C:\Users\ethan\Documents\Projects\Luna\Keys\`)
   - OU salve como `orbit-legacy/scripts/serviceAccountKey.json` se preferir

2. Instale as deps:
   ```bash
   cd orbit-legacy/scripts
   npm install
   ```

3. Pegue seu UID em:
   - Firebase Console → Authentication → seu user → coluna "User UID"
   - ou Luna Legacy → DevTools → Application → Local Storage → `uid` (sem aspas)

4. Rode apontando pra sua chave (exemplo com chave em `C:\Users\ethan\Documents\Projects\Luna\Keys\`):
   ```bash
   # PowerShell
   $env:LUNA_FIREBASE_KEY = "C:\Users\ethan\Documents\Projects\Luna\Keys\sua-chave.json"
   node set-owner-flag.js <seu-uid>

   # Git Bash / WSL
   LUNA_FIREBASE_KEY=/c/Users/ethan/Documents/Projects/Luna/Keys/sua-chave.json \
     node set-owner-flag.js <seu-uid>
   ```

   Se a chave estiver na mesma pasta do script, só:
   ```bash
   node set-owner-flag.js <seu-uid>
   ```

Saída esperada:
```
✓ users/AbCdEf123... atualizado: isOwner=true
```

5. Abra a aba Uso no Legacy → deve mostrar "Uso ilimitado — Conta owner".

## Segurança

- O `serviceAccountKey.json` **nunca** vai pro git (ver `.gitignore` da raiz).
- O `.gitignore` da raiz já ignora `**/serviceAccountKey.json` e qualquer `*-firebase-adminsdk-*.json`.
- **Mantenha a chave fora do repo** (ex.: pasta `Keys/` ao lado dos projetos).
- Se vazar, **revoga imediatamente** no Firebase Console e gera outro.
