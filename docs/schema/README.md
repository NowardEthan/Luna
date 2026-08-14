# Schema do Firestore compartilhado (Luna)

Este diretório contém os **contratos congelados** do Firestore usado por **OrbitLab (Android/Kotlin)** e **orbit-legacy (Electron/TypeScript)**. Qualquer mudança aqui é breaking change nos dois apps.

## Filosofia

- **Um único backend, dois clientes**: `luna-8787d` no Firebase. O que o user cria no celular aparece no desktop e vice-versa.
- **Cloud = subconjunto compartilhado.** Campos exclusivos do desktop (ex: `agentSteps`, `ideContexts`, `lunaPipelineTrace`) ficam só no `Conversation.messages` local. Reasoning e citations sobem porque fazem sentido em qualquer UI.
- **Subcoleção de mensagens** (`users/{uid}/conversations/{cid}/messages/{mid}`), não array inline. Conversa é metadata; mensagens são documentos independentes.
- **Versionamento**: `schemaVersion: 2` no doc da conversa marca formato novo. Conversas legadas (sem esse campo ou com messages inline) passam por migração única na primeira escrita/puxada.

## Arquivos

| Schema | Path no Firestore | Quem escreve | Quem lê |
|---|---|---|---|
| [cloud-conversation](./cloud-conversation.schema.json) | `users/{uid}/conversations/{id}` | Ambos (Lab + legacy) | Ambos |
| [cloud-message](./cloud-message.schema.json) | `users/{uid}/conversations/{id}/messages/{mid}` | Ambos | Ambos |

## Convenções

### Roles

- `role: "assistant"` é o padrão (legacy usa; vamos normalizar).
- OrbitLab historicamente grava `"luna"` em alguns lugares. **Clientes devem aceitar ambos na leitura**, mas gravar sempre `"assistant"`.

### Timestamps

- Conversas e mensagens usam **Firebase `Timestamp`**, não `number` Unix ms.
- Conversas legacy (no localStorage) tinham `updatedAt: number` — converter pra Timestamp na hora de subir (`Timestamp.fromMillis(n)`).
- Documentos (`users/{uid}/documentos/{id}`) usam `long` Unix ms — isso é Lab-only e não nos concerne aqui.

### IDs reservados

Algumas conversas têm IDs reservados pelo Lab:
- `"financas"` — conversa fixa de Finanças
- `"ideias-geral"` — caixa de ideias
- `"rotina-*"` — sessões de bloco/rotina

**Ambos apps escondem estes da sidebar geral.** Sincronizam no Firestore mas só aparecem em seções dedicadas (Finanças, Ideias, Rotinas). Regra explícita no `x-special-conversation-ids.hideRule` do schema.

**Por quê:** o Lab tem UI dedicada pra cada um; mostrar na sidebar geral quebraria o fluxo de IA principal (mistura conversa real com conversa de sistema). Decidido em 2026-08-09.

**Filtro:** `(id != 'financas') AND (id != 'ideias-geral') AND NOT id.startsWith('rotina-')`

### last-write-wins

Sincronização entre os dois apps é **last-write-wins por conversa inteira** (não por mensagem individual). Edições concorrentes na mesma conversa podem perder dados de um lado — limitação documentada v1.

Resolução: `cloudUpdatedAt` no doc da conversa. Cada write atualiza esse campo. Merge compara com o `updatedAt` local da `Conversation`.

## Validação

Os schemas são JSON Schema (Draft 2020-12). Pra validar localmente:

```bash
npx ajv validate -s docs/schema/cloud-conversation.schema.json -d exemplo.json
```

## Mudanças breaking

Adicionar campo opcional: OK. Mudar tipo, remover campo, ou adicionar required: requer bump de `schemaVersion` + migration.