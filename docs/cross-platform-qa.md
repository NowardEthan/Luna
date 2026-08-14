# QA — Sincronização cross-platform OrbitLab ↔ orbit-legacy

## Contexto

As Fases 1–6 reescreveram o `cloudSyncService` pra gravar conversas em subcoleção
(`users/{uid}/conversations/{cid}/messages/{mid}`) com `schemaVersion: 2`,
casando com o schema do OrbitLab.

Esta fase valida que os dois apps lêem e escrevem no mesmo Firestore sem quebrar
dados existentes e sem perder mensagens.

---

## Parte 1 — Smoke test local (legacy)

Antes de testar com o Lab, valida que o app desktop pelo menos não quebrou.

### Setup

```bash
cd C:\Users\ethan\Documents\Projects\Luna\orbit-legacy
npm run dev
```

App abre. Faz login com qualquer conta Google ou Aura que já esteja cadastrada.

### Cenários

| # | Ação | Esperado |
|---|---|---|
| S1 | Login com Google | Abre a janela principal. Sidebar mostra conversas existentes. |
| S2 | Login com email/senha (Conta Aura) | Idem S1. |
| S3 | Criar conversa nova, enviar 1 msg user | Mensagem aparece no chat. Não trava. |
| S4 | Ver `cloudSyncService.getStatus()` no console | `pushing: true → false`, `lastError: null` |
| S5 | Aguardar 60s (debounce) → abrir Firebase Console → `users/{uid}/conversations/` | Doc com `schemaVersion: 2`, sem `messages` array inline. |
| S6 | Firebase Console → `users/{uid}/conversations/{cid}/messages/` | 1 doc com `role: "user"`, `text`, `createdAt`. |
| S7 | Criar 2ª mensagem (assistant response) | Aparece na UI. Push agendado. |
| S8 | Aguardar 60s → verificar Firebase Console | Subcoleção tem 2 docs. Metadata doc tem `messageCount: 2`, `preview` correto. |
| S9 | Reload (Ctrl+R) | Conversas persistem. Sem tela de login. |
| S10 | Click "Sincronizar agora" no perfil | `pullFromCloud` roda, sem erro. |

### Critério de pronto local

- S1–S10 passam sem `console.error` vermelho
- Firebase Console mostra `schemaVersion: 2` no doc da conversa
- Subcoleção `messages/` tem 1 doc por mensagem enviada

### Se algo falhar

- `pushing: true` travado → console: `lastError` mostra a razão
- Doc sem `schemaVersion: 2` → pull não conseguiu (raro, ver Fase 6)
- Mensagem sumiu → `pullFromCloud` pode estar sobrescrevendo local com remote vazio (ver `mergeConversations`)

---

## Parte 2 — E2E cross-platform

### Setup de contas

Criar 3 contas de teste no Firebase Console (ou usar existentes):

| Conta | App que vai usar | Pra que serve |
|---|---|---|
| `lab.test@noward.dev` | Apenas OrbitLab | Donor de dados no schema nativo |
| `legacy.test@noward.dev` | Apenas legacy | Donor de dados no schema novo |
| `both.test@noward.dev` | Ambos alternadamente | Testa conflict resolution |

Todas precisam:
- Firebase Auth habilitado (Google + email/senha)
- `ensureUserProfile` rodou pelo menos uma vez (1º login)

### Pré-condições

- [ ] App legacy rodando (`npm run dev` em `orbit-legacy/`)
- [ ] Lab APK instalado no celular/emulador
- [ ] Ambos logados com as contas acima
- [ ] Firebase Console aberto em `users/{uid}` da conta `both.test@noward.dev`

---

### Cenários E2E

#### Bloco A — Criação básica

| # | Ação no App A | Esperado no App B | Como forçar |
|---|---|---|---|
| A1 | Criar conversa "Teste cross A1" no Lab | Aparece no legacy em ≤60s | Reload no legacy + click "Sincronizar" |
| A2 | Criar conversa "Teste cross A2" no legacy | Aparece no Lab em ≤10s | Lab já tem onSnapshot; abrir sidebar |
| A3 | Enviar msg user "Oi do Lab" no Lab | Aparece no legacy | Pull manual no legacy |
| A4 | Enviar msg user "Oi do legacy" no legacy | Aparece no Lab | Aguardar 60s (push debounce) |
| A5 | Verificar Firebase Console: `users/{uid}/conversations/{cid}/messages/` | 2 docs (1 user, 1 assistant), timestamps crescentes | |

**Critério:** 5 cenários passam. Mensagens sincronizam em ambas direções.

#### Bloco B — Edição e metadata

| # | Ação | Esperado | Validação |
|---|---|---|---|
| B1 | Renomear conversa no Lab | Title atualizado no legacy (em ≤60s) | Firebase Console: campo `title` mudou |
| B2 | Renomear conversa no legacy | Title atualizado no Lab | Mesma |
| B3 | Pin/unpin conversa no Lab | Legacy ignora (campo legacy-only) | UI legacy inalterada |
| B4 | Pin/unpin conversa no legacy | Lab ignora | UI Lab inalterada |
| B5 | Mover conversa pra pasta no legacy | Lab ignora | Conversa some da "raiz" no legacy, continua onde está no Lab |
| B6 | Editar `username` no perfil legacy | Lab vê o novo username | `users/{uid}.username` no Firebase Console |

**Critério:** metadata respeita `writeOnly: true` (campos legacy-only não viram Lab e vice-versa).

#### Bloco C — Delete

| # | Ação | Esperado | Validação |
|---|---|---|---|
| C1 | Deletar conversa no Lab | Some do legacy (em ≤60s) | Firebase Console: `deletedAt` populado |
| C2 | Deletar conversa no legacy | Some do Lab | Mesma |
| C3 | Deletar conversa + reabrir Lab | Lab NÃO mostra | Lab filtra `deletedAt != null` |
| C4 | Apagar conta toda no legacy | Lab perde acesso (token inválido) | Tela de login aparece |

**Critério:** delete é respeitado em ambos apps. Apagar conta cascade.

#### Bloco D — IDs reservados (HIDE_IN_BOTH)

| # | Ação | Esperado | Validação |
|---|---|---|---|
| D1 | Criar conversa com ID `financas` no Lab (via código ou script) | Legacy NÃO mostra na sidebar geral | `filterReservedConversations` filtra |
| D2 | Criar conversa `rotina-teste` no Lab | Legacy NÃO mostra | Idem |
| D3 | Criar conversa `ideias-geral` no Lab | Legacy NÃO mostra | Idem |
| D4 | Legacy cria conversa com nome "qualquer" mas ID `rotina-123` | Lab NÃO mostra | Filtro Lab |

**Critério:** ambos apps escondem conversas reservadas da sidebar geral.

**Pra criar conversa com ID reservado via Lab:** Lab hoje permite criar conversa com qualquer ID via long-press / rename — não tem validação. Se for difícil, criar via Firebase Console diretamente (`Add document` em `users/{uid}/conversations/` com `id: "rotina-teste"` e metadata mínima).

#### Bloco E — Migração de schema (Fase 6)

| # | Setup | Ação | Esperado |
|---|---|---|---|
| E1 | Criar conversa LEGADA no Firestore (mensagens inline, sem schemaVersion) usando Firebase Console manual | Pull no legacy | Migra automaticamente. Aparece na sidebar. Firebase Console: agora `schemaVersion: 2`, sem `messages` array, com subcoleção populada |
| E2 | Idem E1 mas com conversa grande (>500 msgs) | Pull no legacy | Migra em chunks. UI não trava. Pode demorar ~30s |
| E3 | 2 clients puxam simultaneamente | Pull em ambos | Um migra, outro vê doc já migrado. Sem erro de write conflict |

**Critério:** Fase 6 funciona. Conversas legadas viram visíveis após pull.

**Pra criar conversa legada manualmente:**
1. Firebase Console → `users/{uid}/conversations/test-legacy-{n}`
2. Add document com:
   ```json
   {
     "title": "Conversa legada teste",
     "messages": [
       { "id": "m1", "role": "user", "text": "oi" },
       { "id": "m2", "role": "assistant", "text": "olá" }
     ],
     "updatedAt": <Timestamp atual>
   }
   ```
3. Pull no legacy com essa conta
4. Verificar: doc agora tem `schemaVersion: 2`, `messages` sumiu, subcoleção `messages/m1` e `messages/m2` existem

---

### Critérios globais de "pronto"

- [ ] Todos os 12 cenários principais (A1-A5, B1, B6, C1-C2, D1, E1) passam consistentemente (3 tentativas cada)
- [ ] Sem `console.error` vermelho em nenhum app
- [ ] Latência Lab→legacy ≤ 60s (debounce), legacy→Lab ≤ 10s (push debounce)
- [ ] Build de produção passa: `npm run build` em legacy
- [ ] APK release do Lab compila sem warnings
- [ ] Sem regressão: smoke test local (S1-S10) ainda passa

### Riscos conhecidos (v1)

| Risco | Mitigação |
|---|---|
| Conflito Lab↔legacy em mensagens diferentes da mesma conversa | Last-write-wins por conversa. Edições simultâneas podem perder dados de um lado. |
| Migração inicial lenta (50+ conversas legadas) | Roda automaticamente no primeiro pull. Sem callback de progresso. |
| `imageAttachments` do Lab sem `uri` remoto | UI mostra imagem quebrada (placeholder). Resolver em Fase 4.5 (download via Storage). |
| Reasoning em formato diferente (Lab manda string, legacy manda objeto) | Adapter preenche `reasoningTrace.text` no legacy. UX aceitável. |

---

### Como rodar o smoke test rápido

```bash
# Legacy (Electron)
cd orbit-legacy
npm run dev

# Lab (Android Studio → emulator → Run)
# Build: ./gradlew :app:installDebug
# Inicia o app no emulator
```

**Atalho:** se quiser validar push-only (sem se preocupar com pull), abre o Console do Electron enquanto o legacy roda e digita:

```js
window.__cloudSync = await import('/src/features/sync/cloudSyncService.ts')
window.__cloudSync.cloudSyncService.getStatus()
// → { lastSyncAt, lastError, pushing }
```

Pra forçar push imediato:

```js
window.__cloudSync.cloudSyncService.pullFromCloud()
```

---

### Quando reportar bug

Se algum cenário falhar:

1. Qual cenário (# do A1-E3)
2. Logs do Console (legacy) + logcat (Lab)
3. Estado do Firestore naquele momento (Firebase Console → conversa/doc específico)
4. Timestamp aproximado (pra correlacionar)

Essas 4 infos resolvem 90% dos bugs. Sem elas é chute.