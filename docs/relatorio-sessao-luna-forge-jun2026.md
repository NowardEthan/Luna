# Relatório de sessão — Integração Luna Core × Orbit / Luna Forge

> Documento de continuidade: tudo o que foi feito desde a chegada do Claude Code até ao estado actual (junho/2026).  
> **Autor da sessão:** Ethan Noward · **Assistência:** Cursor (Auto)  
> **Repositórios:** [Orbit](C:\Users\ethan\Documents\Projects\Orbit) · [Luna Core](C:\Users\ethan\Documents\Core\Luna\src\luna-core)

---

## 1. Contexto inicial

Ethan estava a integrar o **Luna Core** (motor cognitivo PAIA) com o **Orbit** (cliente desktop Electron + React), com trabalho prévio feito no **Claude Code**. Ao pedir ajuda no Cursor, o chat principal já funcionava end-to-end, mas havia legado multi-LLM, gaps de memória, e o addon IDE ainda não era um produto completo.

**Objectivo implícito:** transformar o Orbit num ambiente desktop coerente da Luna — chat unificado no Core, IDE estilo Cursor, memória persistente, e IA local via LM Studio.

---

## 2. Visão dos dois mundos

| Papel | Caminho | Responsabilidade |
|-------|---------|------------------|
| **Luna Core** | `Core/Luna/src/luna-core` | Pipeline PAIA: tálamo → análise → política → memória → resposta; sessões; SQLite; constituição |
| **Orbit** | `Projects/Orbit` | UI, Electron, Luna Forge (IDE), addons, sync, bridge IPC → Core |

```
Orbit (UI)
  SimpleChatComposer / Forge chat
       ↓
  window.lunaCore.executarPipeline  (IPC)
       ↓
  lunaCoreBridge.cjs  →  executarPipelineCompleto  (Luna Core)
       ↓
  Análise (modelo menor) → Política (regras) → Memória (modelo menor) → Resposta (modelo maior)
```

---

## 3. Cronologia do que fizemos

| Ordem | Pedido / marco | Resultado |
|-------|----------------|-----------|
| 1 | Ajuda na integração Orbit ↔ Luna Core | Diagnóstico: chat OK; legado multi-LLM e presença a limpar |
| 2 | Roadmap completo | [`luna-core-integration-roadmap.md`](./luna-core-integration-roadmap.md) + links no README e `CONTINUIDADE-IA.md` |
| 3 | **Fase I1** — consolidação Luna-only | Catálogo multi-LLM removido do boot; legado arquivado |
| 4 | **Fase I2** — import Node nativo | `lunaCoreBridge.cjs`; ~200 ms overhead vs ~10 s com `npx tsx` |
| 5 | Memória: “porque ela não lembra?” | Diagnóstico: sessões isoladas + SQLite ABI + sem recall cross-sessão |
| 6 | **Fase I4** (sem I3 streaming) | Sessões unificadas, recall, `refletirSessao`, painel memória Core |
| 7 | Painel de actividades | Melhorias visuais e feedback de pipeline |
| 8 | **Fase I5** — IDE no Core | Inventário, contrato, `useIdeLunaCoreTurn` |
| 9 | Refactor IDE por workspaces | Chats separados por workspace; Luna universal entre modos |
| 10 | Integração total Luna Core no IDE | Remoção do GPT-OSS 120B no fluxo IDE |
| 11 | **Luna Forge** — tela inicial | IDE como produto à parte; home com recentes; sem chat até abrir projecto |
| 12 | Layout estilo Cursor + roadmap Forge | [`luna-forge-cursor-roadmap.md`](./luna-forge-cursor-roadmap.md) |
| 13 | **F2** — sidebar & navegação | Search, Git, outline, palette, multi-root, atalhos |
| 14 | Bugs scroll editor ↔ chat | Correcções de overflow e remount |
| 15 | **F3** — editor avançado | LSP, lint, format, split, minimap, diff inline |
| 16 | Otimização performance (app inteiro) | Memoização, redução re-renders, transições |
| 17 | Input chat auto-grow | `useAutoResizeTextarea` em todos os composers |
| 18 | Animações / feedback Luna | `TurnActivityPanel`, `LunaPipelineActivityBody`, fases do turno |
| 19 | **F4** — terminal PTY | Terminal interactivo; bug de input corrigido |
| 20 | **F5** — IA estilo Cursor | Loop híbrido, `@mentions`, light review |
| 21 | Bugs F5 | `@modelo.py`, `llmSelection`, rate limit Groq, respostas JSON cruas |
| 22 | LM Studio local | Qwen2.5-VL-7B no Core e Orbit |
| 23 | Pipeline “rápido demais” | Análise/memória caíam em regras — fix provedor JSON |
| 24 | Validação final | Probe: análise + memória + resposta com `fonte: "llm"` |
| 25 | Bug: "Renova em X dias" oculto | `LunarGateScreen` UsageTab — texto por baixo do botão close; movido para row da progress bar |
| 26 | Bugs Firestore INTERNAL ASSERTION | Causa: cache HMR stale com `getMockUsage` removido → hard refresh resolve |
| 27 | **Refactor UX do shell** | `AppSidebar.tsx` unificado (240 px) substituindo ActivityBar + ContextRail + SidebarLayout; +96 px de tela |
| 28 | Bug: usuário preso no Marketplace | Sidebar era `undefined` em views não-chat; agora sempre visível; nav "Chat" adicionado |
| 29 | Bug: usuário preso no IDE | `onSwitchToChat` propagado AppShell → IdeWorkbench → ForgeActivityBar + LunaForgeHome |
| 30 | **Refactor UX do IDE (F6)** | Defaults (AI=false, bottom=false), ForgeStatusBar reescrita, ForgeActivityBar polish, ForgeSidebar header limpo |

---

## 4. Integração Luna Core (fases I0–I5)

### I0 — Piloto funcional ✅

- IPC `lunaCore:executarPipeline`
- `useSimpleChatTurn` no chat principal
- `ChatColumn` + refatoração `AppShell`
- Label fixo **Luna · PAIA**
- Remoção do piloto de presença (fila/overlay)
- `LUNA_CORE_PATH` configurável

### I1 — Consolidação Luna-only ✅

| Entrega | Detalhe |
|---------|---------|
| `chatPreferencesStore.ts` | Personalidade, RAG, reasoning — sem catálogo de modelos |
| Legado arquivado | `ChatComposer`, `ModelSelector`, `modelCatalogStore` → `src/_archive/chat-legacy/` |
| `StatusBar` | `fixedModelLabel="Luna · PAIA"` |
| `useConversations` | Domínio `model` limpo; sem `llmSelection` morto |
| Docs | `architecture.md`, `README.md`, roadmap actualizado |

### I2 — Import Node nativo ✅

| Entrega | Detalhe |
|---------|---------|
| `luna-core` exports | `entry-desktop.js`, `./pipeline` |
| `electron/lunaCoreBridge.cjs` | Import directo do `dist/` — sem subprocesso |
| Scripts npm | `luna-core:build`, `luna-core:check`, `luna-core:check:electron`, `luna-core:rebuild-electron` |
| Latência | Overhead de integração ~200 ms (vs ~10 s antes) |

### I3 — Streaming ❌ cancelado

Decisão de produto: resposta completa por turno; sem streaming token-a-token.

### I4 — Sessões e memória unificadas ✅

**Porque a Luna “não lembrava”:**

1. Cada conversa nova = nova sessão Core (contexto isolado)
2. Orbit não injectava histórico de outras conversas
3. `better-sqlite3` com ABI errado fora do Electron → memória longa falhava

**Correcções:**

| Item | Ficheiro / módulo |
|------|-------------------|
| `Conversation.lunaSessaoId` | Mapeamento 1:1 Orbit ↔ Core |
| `prepararSessao` | Cria sessão ao abrir conversa |
| Recall cross-sessão | `buscarContextoOutrasSessoes` + `contexto_cross_sessao` |
| `refletirSessao` | Consolida factos ao apagar conversa |
| UI memória | `LunaCoreMemorySection` + `useLunaCoreMemory` |
| Script recall | `check-luna-core-recall.cjs` |

### I5 — IDE no Core 🔵 ~55–70%

| Item | Estado |
|------|--------|
| Inventário `runAgentTurn` vs Core | ✅ |
| Contrato IDE ↔ Core | ✅ [`luna-ide-core-bridge.md`](./luna-ide-core-bridge.md) |
| `useIdeLunaCoreTurn` + `contexto_ide` | ✅ |
| Loop híbrido I5.6 | ✅ `useIdeHybridTurn` |
| `@mentions` no composer Forge | ✅ |
| Light review `@ficheiro` | ✅ `runIdeLightReview` |
| Desactivar servidor Python | ⬜ pendente |

**Fluxo IDE actual (`useIdeHybridTurn`):**

```
@ficheiro + pedido de revisão  →  runIdeLightReview (1 LLM, sem pipeline completo)
caso contrário                 →  runLunaCoreTurn (pipeline PAIA)
  → se shouldRunIdeAgentLoop     →  runIdeAgentTurnRunner (ferramentas)
  → senão                        →  applyLunaCoreResult
```

---

## 5. Luna Forge — IDE estilo Cursor (F1–F5)

**Nome:** **Luna Forge** — *“A forja onde a Luna constrói contigo”*

### F1 — Shell & layout ✅

- Activity bar interna (Explorer, Search, Git, Chats, Memórias, AI)
- Sidebar colapsável com persistência `localStorage`
- Editor com tabs + breadcrumbs (`ForgeEditorChrome`)
- Painel inferior (Problemas, Saída, Terminal, Debug)
- Painel IA à direita (chat Luna Core)
- Status bar Forge
- Tela inicial sem projecto (`LunaForgeHome`)

**Ficheiros-chave:** `src/components/ide/forge/*`, `ForgeLayoutContext`, `forgeLayout.ts`

### F2 — Sidebar & navegação ✅

- Pesquisa global (`ForgeSearchPanel`)
- Git completo (branch, stage, diff, commit)
- Explorador CRUD + menu contexto
- Outline / símbolos TS/JS
- Atalhos: `Ctrl+P`, `Ctrl+Shift+F/E/G`, `` Ctrl+` ``, `Ctrl+B`, `Ctrl+J`
- Command palette (`forge:*`)
- Multi-root workspace (`workspaceConfig.ts`)

### F3 — Editor avançado ✅

- Guardar / guardar todos (`Ctrl+S`, `Ctrl+Shift+S`)
- Confirmar tab dirty
- Diagnostics reais (`@codemirror/lint` + LSP)
- Prettier (`Shift+Alt+F`)
- Folding, autocomplete, IntelliSense (typescript-language-server)
- Diff inline (`forgeInlineDiff.ts`)
- Split editor (`Ctrl+\`)
- Minimap
- Correcção foco Tab (não seleccionar UI)
- Correcção scroll editor ↔ chat (overflow, remount)

### F4 — Terminal & painéis ✅

- PTY interactivo (`node-pty` + xterm)
- Múltiplos terminais (abas `+`)
- Painel Output (`forgeOutputStore`)
- **Bug corrigido:** input do terminal não funcionava
  - `ForgeTerminalPanel.tsx`: remount só por `localId`; foco; abas `invisible` vs `hidden`
  - `electron/main.cjs`: `registerForgeDesktopIpc()` sempre registado (fix com `USE_HTTP_SERVER`)

### F5 — IA estilo Cursor 🔵 ~55%

| Item | Estado |
|------|--------|
| Luna Core no IDE | ✅ |
| Loop de ferramentas | ✅ `ideAgentTurnRunner` + `ideToolLoopPolicy` |
| `@mentions` | ✅ `useIdeComposerMentions`, `IdeMentionPicker`, `ideMentions.ts` |
| Composer dedicado Forge (Agent vs Chat) | ⬜ |
| Inline edit `Ctrl+K` | ⬜ |
| Tab completion | ⬜ |
| Review unificado | ⬜ |

### F6 — Polish & identidade 🔵 ~40%

| Item | Estado |
|------|--------|
| ForgeStatusBar reescrita | ✅ Workspace na esquerda, badge removido, × ícone |
| ForgeActivityBar polish | ✅ Botão "Voltar ao Chat" em accent, separador |
| ForgeSidebar header | ✅ Collapse redundante removido |
| Defaults IDE otimizados | ✅ AI=false, bottom=false, tab='problems' |
| Tema refinado, zen mode, onboarding | ⬜ |
| Empacotamento `luna-ide` | ⬜ |

**Progresso global Forge:** ~90% (F1–F4 concluídas; F5 parcial; F6 ~40%)

---

## 6. Refactor workspaces e identidade IDE

Antes do Forge, o IDE partilhava demasiado com o chat global. Foi implementado:

| Conceito | Implementação |
|----------|---------------|
| Chats por workspace | `workspaceSessions.ts`, `sourceMode: 'ide'`, `workspaceRoot` |
| Chats gerais | `CHAT_SCOPE_KEY = '__chat__'` |
| Luna universal | Memória Core partilhada; contexto de conversa separado por scope |
| Home Forge | Abrir projecto → workbench; sem chat na tela inicial |
| Recentes | Lista de pastas com contagem de chats e última actividade |
| Branding | `lunaForgeBrand.ts`, i18n PT/EN |

---

## 7. Melhorias transversais (UX e performance)

### Input de chat auto-grow

- Hook `useAutoResizeTextarea.ts` + `resizeTextareaElement`
- Aplicado ao `SimpleChatComposer` e equivalentes em todo o app
- Cresce com quebras de linha até altura máxima configurável

### Feedback visual da Luna

- `TurnActivityPanel` — painel de actividade por turno (estado live)
- `LunaPipelineActivityBody` — trace do pipeline (análise, política, memória)
- `composerWorkingLabel` / `workingPhase` no `AppShell` — labels por fase

### Performance

- Memoização em `AppShell`, `ChatColumn`, listas de mensagens
- Redução de re-renders durante digitação no editor e no chat
- Optimizações além do IDE (chat geral, painéis, etc.)

### Outros polish

- Avisos/dialogs alinhados ao design system
- Scroll e selecção de código estáveis com editor + chat abertos

---

## 8. Configuração LM Studio (local)

Modelo: **Qwen2.5-VL-7B-Instruct-GGUF**  
Path GGUF: `C:\Users\ethan\.lmstudio\models\lmstudio-community\Qwen2.5-VL-7B-Instruct-GGUF`

**`luna-core/.env`:**

```env
LUNA_API_KEY=lm-studio
LUNA_API_BASE=http://localhost:1234/v1
LUNA_MODELO_MENOR=qwen/qwen2.5-vl-7b
LUNA_MODELO_MAIOR=qwen/qwen2.5-vl-7b
```

**`Orbit/.env`:**

```env
LLM_PRIMARY=ollama
LLM_CLOUD_ENABLED=0
OLLAMA_BASE_URL=http://127.0.0.1:1234/v1
OLLAMA_MODEL=qwen/qwen2.5-vl-7b
LUNA_CORE_PATH=C:\Users\ethan\Documents\Core\Luna\src\luna-core
```

---

## 9. Correção crítica — pipeline “rápido demais”

### Sintoma

Respostas muito rápidas; sensação de que o PC estava “a voar”. Na prática, **só o respondedor** chamava o LLM; análise e memória caíam sempre em `fonte: "regras"`.

### Causa

1. `response_format: { type: "json_object" }` incompatível com LM Studio
2. Parser JSON frágil quando o modelo devolvia markdown ou texto em volta do JSON

### Correcção (Luna Core)

| Ficheiro | Alteração |
|----------|-----------|
| `src/providers/extrairJsonResposta.ts` | Parser tolerante; `isProvedorLocal()`; `usarJsonEstritoOpenAi()` |
| `src/providers/openaiCompativel.ts` | Local: sem `json_object`; cloud: retry sem JSON estrito em 400 |
| `src/analyzers/analisadorContextoLlm.ts` | Usa `extrairJsonResposta` |
| `src/memoria/analisadorMemoria.ts` | Usa `extrairJsonResposta` |
| `tests/extrairJsonResposta.test.ts` | 5 testes unitários |
| `.env.example` | Documentação `LUNA_JSON_ESTRITO` |

### Validação (probe via bridge Orbit)

Mensagem: *“explica como funciona um pipeline em typescript”*

```json
{
  "analise":  { "fonte": "llm", "modelo": "qwen/qwen2.5-vl-7b", "latencia": ~41s },
  "memoria":  { "fonte": "llm", "modelo": "qwen/qwen2.5-vl-7b" },
  "resposta": { "modelo": "qwen/qwen2.5-vl-7b", "latencia": ~60s }
}
```

**Nota:** 3 chamadas LLM sequenciais num 7B local ≈ 2 min por turno complexo — comportamento esperado.

---

## 10. Bugs corrigidos (lista consolidada)

| Bug | Causa | Fix |
|-----|-------|-----|
| Terminal sem input | IPC não registado + lifecycle PTY | `registerForgeDesktopIpc` + `ForgeTerminalPanel` |
| Scroll editor ↔ chat | Overflow / remount agressivo | Ajustes layout e visibilidade painéis |
| Tab indenta UI | Foco no workbench | Restaurar foco editor; atalhos Forge |
| `@modelo.py` não reconhecido | Regex `@mentions` ignorava ficheiros na raiz | `ideMentions.ts` + testes |
| Resposta JSON/tool stub | Parser + light review mal encadeado | `runIdeLightReview`, ordem no híbrido |
| `llmSelection is not defined` | Variável sem `ctx.` | `runAgentTurn.ts` linha 333 |
| Rate limit Groq 429 | Muitas chamadas no IDE | Atalho light review + contexto compacto |
| SQLite em probe Node | ABI Node 127 vs 140 (Electron) | `npm run luna-core:rebuild-electron` quando necessário |
| Análise/memória em regras (LM Studio) | `json_object` + parse frágil | Ver secção 9 |

---

## 11. Documentos criados ou actualizados

| Documento | Conteúdo |
|-----------|----------|
| [`luna-core-integration-roadmap.md`](./luna-core-integration-roadmap.md) | Fases I0–I6 integração Core × Orbit |
| [`luna-forge-cursor-roadmap.md`](./luna-forge-cursor-roadmap.md) | Fases F1–F6 IDE estilo Cursor |
| [`luna-ide-core-bridge.md`](./luna-ide-core-bridge.md) | Contrato IDE ↔ pipeline Core |
| [`architecture.md`](./architecture.md) | Fluxo `useSimpleChatTurn` |
| `README.md` (Orbit) | Config Luna Core |
| `CONTINUIDADE-IA.md` (Luna) | §1.1 Cliente Orbit |
| **Este relatório** | Histórico completo da sessão |

---

## 12. Estado actual (snapshot)

### Integração Core (I)

```
I0  Piloto           ████████████████████  100%  ✅
I1  Luna-only        ████████████████████  100%  ✅
I2  Import nativo    ████████████████████  100%  ✅
I3  Streaming        — cancelado —
I4  Sessões/memória  ████████████████████  100%  ✅
I5  IDE no Core      ████████████░░░░░░░░   ~65%  🔵
I6  Empacotamento    ░░░░░░░░░░░░░░░░░░░░    0%  ⬜
```

### Luna Forge (F)

```
F1  Shell/layout     ████████████████████  100%  ✅
F2  Sidebar          ████████████████████  100%  ✅
F3  Editor           ████████████████████  100%  ✅
F4  Terminal         ████████████████████  100%  ✅
F5  IA Cursor-like   ███████████░░░░░░░░░   ~55%  🔵
F6  Polish           ████████░░░░░░░░░░░░   ~40%  🔵
Total ponderado: ~90%
```

---

## 13. Comandos úteis

```bash
# Orbit
cd C:\Users\ethan\Documents\Projects\Orbit
npm run dev
npm run luna-core:build
npm run luna-core:check
npm run luna-core:check:electron
npm run luna-core:rebuild-electron   # SQLite no Electron

# Luna Core
cd C:\Users\ethan\Documents\Core\Luna\src\luna-core
npm run build
npm test
```

---

## 14. Próximos passos recomendados

1. **F5** — inline edit `Ctrl+K` e composer dedicado Forge (modo Agent vs Chat)
2. **F5** — review unificado de alterações (gutter + Problems sincronizados)
3. **F6** — tema refinado (cores, densidade, animações) + onboarding Forge
4. **I5.5** — avaliar desactivação do servidor Python quando Core + agente Orbit cobrirem 100%
5. **I6** — empacotamento reproduzível (sem paths hardcoded)

---

## 15. Notas operacionais

- **`luna-core:rebuild-electron`** — só necessário após actualizar Electron/Node ou na primeira vez que memória longa falhar no app; **não** é preciso a cada `npm run build` do TypeScript.
- **Reiniciar Orbit** após `luna-core:build` para carregar `dist/` novo.
- **LM Studio** deve estar a servir em `localhost:1234` com o modelo carregado antes de testar o pipeline local.
- **Commits** — alterações desta sessão ainda não foram commitadas (aguardar pedido explícito).

---

---

## 16. UX Refactor — Shell + IDE (2026-06-09)

### Shell principal

**Problema:** três colunas de nav à esquerda (ActivityBar 48 px + ContextRail 48 px + Sidebar 0–288 px) com ícones sem label, sidebar escondida por padrão, mental model IDE aplicado a chat.

**Solução:** `AppSidebar.tsx` unificado (240 px fixo, sempre visível):
- Header: logo ✦ Luna clicável + botão nova conversa
- Tabs de painel: Histórico / Memórias (só em modo chat)
- Conteúdo scrollável: HistoryPanel ou MemoriesPanel
- Nav footer: Chat + Marketplace + Finanças (com label → melhor descoberta)
- User footer: avatar + nome + badge de plano + ícone de settings
- Em views não-chat: mostra painel vazio com mensagem contextual

**Resultado:** +96 px de largura de conteúdo; navegação nunca prende o usuário.

**Arquivos modificados:** `AppSidebar.tsx` (novo), `MainLayout.tsx`, `AppShell.tsx`, `ChatSessionHeader.tsx`

### IDE — Luna Forge

**Problemas:** AI panel + bottom panel abertos por padrão consumiam ~60% da tela; StatusBar com badge central redundante; sem saída clara do IDE para o chat.

**Soluções:**

| Problema | Arquivo | Mudança |
|---|---|---|
| AI + bottom abertos | `forgeLayout.ts` | `readForgeAiPanelOpen` default false; `readForgeBottomOpen` default false; tab → `'problems'` |
| StatusBar badge central | `ForgeStatusBar.tsx` | Reescrita: workspace na esquerda, badge removido, × ícone compacto |
| Botão "Voltar ao Chat" genérico | `ForgeActivityBar.tsx` | `text-accent + hover:bg-accent/10` — visualmente distinto das views normais |
| Collapse redundante | `ForgeSidebar.tsx` | Botão removido (colapso via click no ícone ativo da activity bar) |
| Sem saída do IDE | `IdeWorkbench.tsx`, `LunaForgeHome.tsx` | `onSwitchToChat` propagado de AppShell → ForgeActivityBar + LunaForgeHome |

**Nota localStorage:** usuários existentes precisam limpar `luna-forge-ai-open` e `luna-forge-bottom-open` para ver os novos defaults.

---

*Última atualização: 2026-06-09 · Sessão Claude Code — UX refactor shell + IDE*
