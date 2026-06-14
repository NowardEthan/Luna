# Bridge IDE × Luna Core (I5)

Contrato do **dual stack** enquanto o modo IDE não migra totalmente para `executarPipelineCompleto`.

Atualizado: junho/2026.

---

## Workspaces (chats separados)

Cada **workspace IDE** tem os seus próprios chats (`sourceMode: 'ide'`, `workspaceRoot`). O chat geral (`sourceMode: 'chat'`) fica no modo conversa — histórico filtrado, sem mistura.

- Ao abrir uma pasta: retoma ou cria conversa daquele projecto
- `activeIdByScope` persiste a última conversa por workspace
- A Luna (memória Core + recall cross-sessão) continua universal entre universos

Ver `src/lib/workspaceSessions.ts`, `useWorkspaceConversationSync.ts`.

---

## Resumo

| Modo | Turno | LLM | Ferramentas | Memória |
|------|-------|-----|-------------|---------|
| **Chat** | `useSimpleChatTurn` | Luna Core (PAIA) | Nenhuma | Core (sessão + SQLite) |
| **IDE** | `useIdeLunaCoreTurn` → `executarPipeline` + `contexto_ide` | **Luna Core (PAIA)** | Em migração (I5.6) | Core sessão + SQLite |
| **Finanças** | Idem IDE | Idem | `luna-finances__*` | Idem |

O router `useChatTurn` escolhe o caminho em tempo de envio via `readWorkbenchMode()` e `readPrimaryView()`.

---

## Arquivos-chave

| Papel | Caminho |
|-------|---------|
| Router chat/IDE | `src/features/chat/useChatTurn.ts` |
| Chat Luna Core | `src/features/chat/useSimpleChatTurn.ts` |
| Agente IDE | `src/_archive/chat-legacy/agentTurnService.ts` |
| Loop de tools | `src/agent/runAgentTurn.ts` |
| Catálogo lazy (IDE) | `src/lib/ideLlmSelection.ts` |
| Contexto workspace | `src/lib/ideContextCompiler.ts` |
| Bridge Core | `electron/lunaCoreBridge.cjs` |

---

## Gap: o que o Core ainda não cobre

1. **Loop multi-step** — até 28 rondas LLM / 72 tool calls (IDE)
2. **Tools** — `read_file`, `apply_patch`, `grep`, terminal, git, RAG, web, finanças, MCP
3. **Contexto IDE** — ficheiros abertos, terminal, @mentions, regras `.luna/rules`
4. **Visão** — anexos de imagem + `describe_images`
5. **Streaming** — token-a-token no agente legado
6. **Execução de `acao: usar_ferramenta`** — Core só classifica; não executa

---

## Contrato híbrido (I5.2)

### Fase actual — IDE no Core (jun/2026)

- **Chat + IDE:** `executarPipeline` com `contexto_ide` (snapshot workspace via `compileIdeContextBlock`)
- **Finanças:** ainda agente legado (multi-LLM) — próxima migração
- **Ferramentas IDE** (`grep`, `apply_patch`, terminal): **I5.6** — loop híbrido quando `politica.acao === usar_ferramenta`
- **Sessão:** `lunaSessaoId` por conversa de workspace; memória longa + cross-sessão activos

### Fase seguinte — bridge Core → tools

Quando `pipeline.politica.acao === "usar_ferramenta"`:

1. Orbit executa tool via `ToolRegistry`
2. Resultado volta ao respondedor (loop híbrido) ou reentra no Core

Campos propostos em `OpcoesPipelineCompleto`:

```typescript
contexto_ide?: { cwd: string; arquivos_abertos: string[]; selecao?: string }
executar_ferramenta?: (nome: string, args: unknown) => Promise<string>
```

Export futuro: `executarTurnoComFerramentas` em `entry-desktop.ts`.

---

## Finanças (I5.4)

- Addon regista tools em `registerAllFinancesTools` ao activar
- Turno usa o mesmo router IDE (`primaryView === 'finances'`)
- Contexto financeiro: `compileFinancesContextBlock` no `agentTurnService`
- **Não** passa pelo pipeline Luna Core hoje

---

## Servidor Python (I5.5)

Permanece necessário para:

- LLM do agente IDE (preferido se `/health` OK)
- RAG workspace, visão, tools HTTP

Deprecar só quando Core + bridge cobrirem 100% dos casos.

---

## Testar

```bash
# Chat — Luna Core
npm run dev
# Modo chat: resposta com painel Pipeline Luna

# IDE — agente + tools (requer servidor ou Electron LLM)
# Activity Bar → IDE → pedir "lista ficheiros na raiz"
# Deve aparecer steps de ferramentas na timeline

npm run luna-core:build   # após mudanças no Core
```

---

## Links

- [luna-ide-tools.md](./luna-ide-tools.md) — ferramentas IDE
- [luna-core-integration-roadmap.md](./luna-core-integration-roadmap.md) — fases I0–I6
