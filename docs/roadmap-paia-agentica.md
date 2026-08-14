# Roadmap — PAIA Agêntica (V3 Agentes + Forge IDE)

> **Objetivo:** Transformar o Luna Forge num IDE agentico estilo Cursor/Claude Code, mantendo a filosofia PAIA multi-modelo. O Core gerencia o loop inteiro — ferramentas, planejamento, execução, avaliação e memória. O Orbit é apenas o executor de ferramentas.
>
> **Repositórios:** Luna Core (`Projects/Luna/core/src/luna-core`) · Orbit (`Projects/Luna/orbit`)
> **Fase Core:** V3 — Cognição preditiva + Agentes locais (continua o que foi iniciado)
> **Última atualização:** 2026-06-10

---

## Arquitetura alvo

```
Mensagem do usuário (no Forge)
        │
        ▼
┌───────────────────────────────────────────────────────────────────┐
│                    LUNA CORE — executarAgenteIde()                │
│                                                                   │
│  1. TÁLAMO              Classifica profundidade do pedido IDE     │
│     (determinístico)    simples / moderado / complexo / crítico   │
│                                                                   │
│  2. PLANEJADOR          Modelo maior — analisa intenção + workspace│
│     (novo neurônio)     Output: { plano, arquivos, ferramentas }  │
│                                                                   │
│  3. MEMÓRIA             SQL lookup (sem LLM) + embeddings         │
│     (existente)         Injeta contexto relevante no executor     │
│                                                                   │
│  4. EXECUTOR            Modelo maior + tools em loop              │
│     (novo neurônio)     Guiado pelo plano; não planeja, executa   │
│          │                                                        │
│          ├── tool_call → toolExecutor(name, args) [ORBIT]         │
│          └── resposta texto → fim do loop                         │
│                                                                   │
│  5. AVALIADOR           Modelo menor (só complexo/crítico)        │
│     (novo neurônio)     "Tarefa concluída?" → nova rodada se não  │
│                                                                   │
│  6. RESPONDEDOR         Modelo maior — resposta humana final      │
│     (existente, adapt.) Resume o que foi feito, em linguagem Luna │
│                                                                   │
│  7. MEMÓRIA PÓS-TURNO   Modelo menor — async, não bloqueia        │
│     (existente)         O que guardar desta sessão de trabalho?   │
└───────────────────────────────────────────────────────────────────┘
        │                              ▲
        │  resultado final             │ toolExecutor(name, args) → string
        ▼                              │
  Orbit UI atualiza                 Orbit executa:
                                    readFile / writeFile / applyPatch
                                    listDir / glob / grep
                                    runTerminalCommand
                                    gitStatus / gitDiff / gitCommit
```

---

## Princípios que guiam o design

1. **Separação planejamento / execução** — o modelo maior planeja e executa (precisão acima de custo — código é complexo e um plano ruim custa mais caro em rodadas extras). O executor não "pensa o que fazer" — já recebe o plano. Avaliador e memória pós-turno usam modelo menor.
2. **Tools no Core, não no Orbit** — as definições de ferramentas vivem no Core (`src/agente/ferramentas/`). O Orbit só provê o executor via callback. Assim o Core controla o contrato.
3. **Tálamo decide profundidade** — pedidos simples ("o que faz essa função?") não passam pelo planejador nem pelo avaliador. Só complexo/crítico usa o pipeline completo.
4. **Memória sempre** — mesmo em pedidos simples, a memória longa é injetada. É o diferencial da Luna vs Cursor.
5. **Retrocompatibilidade** — `executarPipelineCompleto` não é tocado. O chat continua funcionando exatamente como antes.
6. **Streaming de eventos** — o Core emite eventos (`onToolCallStart`, `onToolCallComplete`, `onStatusHint`) para a UI mostrar progresso em tempo real.

---

## Fases de implementação

```
A3.1  Provider com tools        ██████████ 100% ✅  (fundação)
A3.2  Neurônio Planejador       ██████████ 100% ✅  (depende A3.1)
A3.3  Executor Agêntico         ██████████ 100% ✅  (depende A3.1)
A3.4  Neurônio Avaliador        ██████████ 100% ✅  (depende A3.3)
A3.5  Pipeline executarAgenteIde██████████ 100% ✅  (orquestra tudo)
A3.6  Integração Orbit          ██████████ 100% ✅  (depende A3.5)
A3.7  Validação + testes        ░░░░░░░░░░   0% ⬜  (depende A3.6)
```

---

## A3.1 — Provider com suporte a ferramentas

**Hipótese:** O provedor OpenAI-compatível consegue enviar definições de tools e receber `tool_calls` na resposta.

**Por que primeiro:** Tudo depende disso. Sem tool calling no provider, nenhum neurônio agentico funciona.

### Arquivos a criar/modificar

#### `src/providers/tipos.ts` — estender tipos

```typescript
// Adicionar ao arquivo existente:

/** Definição de ferramenta no formato OpenAI. */
export type DefinicaoFerramenta = {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, { type: string; description: string }>
    required?: string[]
  }
}

/** Uma chamada de ferramenta solicitada pelo modelo. */
export type ChamadaFerramenta = {
  id: string           // ex: "call_abc123"
  nome: string         // ex: "read_file"
  argumentos: Record<string, unknown>
}

/** Mensagem com tool_call (assistant → tool) ou resultado (tool → assistant). */
export type MensagemChatAgente =
  | { papel: 'system' | 'user'; conteudo: string }
  | { papel: 'assistant'; conteudo?: string; tool_calls?: ChamadaFerramenta[] }
  | { papel: 'tool'; tool_call_id: string; nome: string; conteudo: string }

export type RequisicaoAgente = {
  modelo: string
  mensagens: MensagemChatAgente[]
  temperatura: number
  ferramentas?: DefinicaoFerramenta[]
}

export type RespostaAgente = {
  conteudo?: string          // resposta texto (fim do loop)
  chamadas?: ChamadaFerramenta[]  // tool calls (continuar loop)
  modelo: string
  latencia_ms: number
}

/** Extensão do ProvedorLlm com suporte a ferramentas. */
export interface ProvedorAgente extends ProvedorLlm {
  completarComFerramentas(req: RequisicaoAgente): Promise<RespostaAgente>
}
```

#### `src/providers/openaiCompativel.ts` — implementar tool calling

Adicionar método `completarComFerramentas()` que:
- Envia `tools` no corpo da requisição (formato OpenAI)
- Faz parse de `choices[0].message.tool_calls` quando presente
- Converte para `ChamadaFerramenta[]`
- Retorna `{ chamadas }` se há tool calls, `{ conteudo }` se é texto final

**Formato do corpo para ferramentas:**
```json
{
  "model": "...",
  "messages": [...],
  "tools": [{ "type": "function", "function": { "name": "...", "description": "...", "parameters": {...} } }],
  "tool_choice": "auto"
}
```

**Formato da resposta com tool_calls:**
```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": null,
      "tool_calls": [{
        "id": "call_abc",
        "type": "function",
        "function": { "name": "read_file", "arguments": "{\"path\": \"src/index.ts\"}" }
      }]
    }
  }]
}
```

### Testes

`tests/provedorFerramentas.test.ts`:
- Mock de API que retorna `tool_calls` → assert `chamadas` populadas
- Mock de API que retorna texto → assert `conteudo` populado
- Mock de API que retorna `tool_calls` vazias → tratado como texto

### Critério de sucesso

`npm test` passa. Mock de provider retorna tool_calls corretamente parseados.

---

## A3.2 — Neurônio Planejador IDE

**Hipótese:** O modelo maior, dado o pedido do usuário + snapshot do workspace, gera um plano estruturado de execução que guia o executor a cometer menos erros e usar menos rodadas. Usar o modelo maior aqui é uma troca deliberada: código exige precisão, e um plano ruim gerado por modelo menor cria mais rodadas de correção que custam mais no total.

**Analogia com PAIA:** É o "analisador de contexto" mas especializado em IDE — entende código, entende workspace, produz um plano de ação em vez de só classificar intenção.

### Arquivo a criar

`src/agente/planejadorIde.ts`

**Input:**
```typescript
export type InputPlanejador = {
  mensagemUsuario: string
  snapshotWorkspace: {
    workspaceRoot: string
    arquivosAbertos: string[]   // paths
    arquivoAtivo?: string
    selecaoAtiva?: string       // código selecionado
    gitStatus?: string
    arquivosRecentes?: string[] // últimos editados
  }
  historicoRecente?: string[]   // últimas 3 mensagens
  memoriaLonga?: string[]       // fatos relevantes do SQLite
}
```

**Output (JSON via modelo maior, temperatura: 0):**
```typescript
export type PlanoExecucao = {
  objetivo: string            // "o que precisa ser feito" em 1 frase
  tipo: 'leitura' | 'edicao' | 'terminal' | 'git' | 'misto'
  arquivos_relevantes: string[]  // paths a ler/editar
  ferramentas_previstas: string[] // read_file, write_file, etc.
  complexidade: 'baixa' | 'media' | 'alta'
  requer_confirmacao: boolean    // ações destrutivas?
  contexto_adicional?: string    // notas para o executor
}
```

**Prompt do planejador:**
- Sistema: "Você é o neurônio planejador do Luna Forge. Analise o pedido e o workspace e gere um plano de execução estruturado em JSON."
- Inclui lista de ferramentas disponíveis
- Inclui snapshot do workspace (arquivos abertos, git status)
- Inclui memória relevante
- Temperatura: 0 (determinístico — `config.modeloMaior`, `config.temperaturaMaior` ignorado aqui)

### Integração com tálamo

O tálamo (`talamoPipeline.ts`) já classifica profundidade. O planejador só roda quando:
- `complexidade >= moderado` no tálamo
- E modo agente ativo

Para `simples` → executor recebe o pedido direto sem plano estruturado.

### Testes

`tests/planejadorIde.test.ts`:
- "refatora a função X do arquivo Y" → plano com `tipo: 'edicao'`, arquivo correto
- "o que faz o método Z?" → plano com `tipo: 'leitura'`, sem edição
- "roda os testes e me diz o que falhou" → plano com `tipo: 'terminal'`
- "faz um commit com as mudanças" → plano com `requer_confirmacao: true`

---

## A3.3 — Executor Agêntico

**Hipótese:** Com um plano estruturado + memória injetada, o modelo maior consegue executar tarefas de código em menos rodadas e com menos alucinações do que sem planejamento prévio.

**Este é o coração da PAIA agêntica** — é onde as ferramentas são chamadas.

### Arquivo a criar

`src/agente/executorAgentico.ts`

**Tipos:**
```typescript
export type PassoExecucao = {
  rodada: number
  ferramenta: string
  argumentos: Record<string, unknown>
  resultado: string
  duracao_ms: number
  sucesso: boolean
}

export type ResultadoExecutor = {
  resposta_final: string
  passos: PassoExecucao[]
  rodadas: number
  concluido: boolean
}

export type OpcoeExecutor = {
  plano?: PlanoExecucao           // do planejador (opcional para simples)
  mensagemUsuario: string
  systemPrompt: string            // identidade + memória já compilados
  ferramentas: DefinicaoFerramenta[]
  toolExecutor: (nome: string, args: Record<string, unknown>) => Promise<string>
  maxRodadas?: number             // default: 10
  onToolCallStart?: (nome: string, args: Record<string, unknown>, rodada: number) => void
  onToolCallComplete?: (passo: PassoExecucao) => void
  onStatusHint?: (hint: string) => void
  abortSignal?: AbortSignal
}
```

**Loop de execução:**
```
mensagens = [{ papel: 'system', conteudo: systemPrompt }, { papel: 'user', conteudo: mensagem }]
rodada = 0

loop:
  rodada++
  if rodada > maxRodadas → break (failsafe)
  
  resposta = provedor.completarComFerramentas({ mensagens, ferramentas })
  
  if resposta.conteudo (texto):
    return { resposta_final: resposta.conteudo, passos, rodadas, concluido: true }
  
  if resposta.chamadas:
    for chamada in resposta.chamadas:
      onToolCallStart(chamada.nome, chamada.argumentos, rodada)
      resultado = await toolExecutor(chamada.nome, chamada.argumentos)
      onToolCallComplete({ ferramenta, resultado, ... })
      
      mensagens.push({ papel: 'assistant', tool_calls: chamada })
      mensagens.push({ papel: 'tool', tool_call_id: chamada.id, conteudo: resultado })
  
  continue loop
```

### Definições de ferramentas (IDE)

`src/agente/ferramentas/definicoes.ts` — catálogo completo:

| Ferramenta | Descrição | Args |
|---|---|---|
| `read_file` | Lê conteúdo de um arquivo | `path: string` |
| `write_file` | Cria/sobrescreve arquivo | `path: string, content: string` |
| `apply_patch` | Aplica diff unificado | `path: string, patch: string` |
| `list_directory` | Lista arquivos e pastas | `path: string, recursive?: boolean` |
| `glob` | Busca arquivos por padrão | `pattern: string` |
| `grep` | Busca texto em arquivos | `pattern: string, path?: string` |
| `run_terminal_command` | Executa comando no terminal | `command: string, cwd?: string` |
| `git_status` | Status do repositório | — |
| `git_diff` | Diff de arquivos | `path?: string, staged?: boolean` |
| `git_commit` | Faz commit (fica pendente na UI) | `message: string, files?: string[]` |
| `search_codebase` | Busca semântica no projeto (RAG) | `query: string` |

Cada definição inclui: `name`, `description` detalhada, `parameters` (JSON Schema).

### Testes

`tests/executorAgentico.test.ts`:
- Mock toolExecutor → assert loop termina quando resposta é texto
- Mock que retorna tool_call → assert toolExecutor chamado com args corretos
- Mock toolExecutor com erro → assert erro tratado, loop continua
- Failsafe: mock que nunca retorna texto → assert loop para em maxRodadas

---

## A3.4 — Neurônio Avaliador de Tarefa

**Hipótese:** Um modelo menor consegue, dado o objetivo original + log de passos, determinar se a tarefa foi concluída com sucesso — e pedir uma segunda rodada quando necessário.

**Quando ativa:** Só em pedidos `complexo` ou `crítico` segundo o tálamo. Para `simples` e `moderado`, o executor termina e pronto.

### Arquivo a criar

`src/agente/avaliadorTarefa.ts`

**Input:**
```typescript
export type InputAvaliador = {
  objetivo: string          // do planejador
  mensagemOriginal: string
  passos: PassoExecucao[]
  respostaExecutor: string
}
```

**Output (JSON via modelo menor):**
```typescript
export type ResultadoAvaliador = {
  concluido: boolean
  confianca: number         // 0..1
  pendencias?: string[]     // o que ainda falta, se não concluído
  sugestao_nova_rodada?: string  // instrução para o executor se houver pendências
}
```

**Regra de loop:** Se `!concluido && confianca < 0.7 && rodadas_restantes > 0` → nova rodada com `sugestao_nova_rodada` como mensagem do usuário para o executor.

**Limite:** Máximo 2 rodadas de avaliação para evitar loops infinitos.

### Testes

`tests/avaliadorTarefa.test.ts`:
- Passos com write_file bem-sucedido → `concluido: true`
- Passos com erro de ferramenta → `concluido: false`
- Passos incompletos (ler mas não escrever quando era pedido de edição) → `concluido: false`

---

## A3.5 — Pipeline `executarAgenteIde`

**Hipótese:** Orquestrar tálamo → planejador → memória → executor → avaliador → respondedor produz resultados melhores e mais consistentes do que qualquer neurônio isolado.

**Este é o equivalente do `executarPipelineCompleto` para modo IDE.**

### Arquivo a criar

`src/pipeline/executarAgenteIde.ts`

**Interface pública:**
```typescript
export type OpcoesPipelineIde = {
  sessaoId?: string
  snapshotWorkspace: SnapshotWorkspace   // do Orbit
  toolExecutor: (nome: string, args: Record<string, unknown>) => Promise<string>
  // Callbacks de progresso (para UI em tempo real)
  onStatusHint?: (hint: string) => void
  onToolCallStart?: (nome: string, args: Record<string, unknown>, rodada: number) => void
  onToolCallComplete?: (passo: PassoExecucao) => void
  // Overrides opcionais
  provedor?: ProvedorAgente
  config?: ConfigLuna
  maxRodadas?: number
  abortSignal?: AbortSignal
}

export type ResultadoAgenteIde = {
  resposta: string
  passos: PassoExecucao[]
  plano?: PlanoExecucao
  avaliacao?: ResultadoAvaliador
  sessao?: MemoriaSessao
  rodadas: number
  latencia_total_ms: number
}
```

**Fluxo interno:**
```typescript
async function executarAgenteIde(mensagem, opcoes): Promise<ResultadoAgenteIde> {
  // 1. Sessão e memória (reutiliza gerenciadorSessao existente)
  const sessao = obterOuCriarSessao(opcoes.sessaoId)
  const memorias = await buscarMemoriasRelevantes(mensagem, sessao)

  // 2. Tálamo (reutiliza talamoPipeline existente)
  const profundidade = classificarProfundidade(mensagem)
  onStatusHint('A analisar pedido…')

  // 3. Planejador (só moderado/complexo/crítico)
  let plano: PlanoExecucao | undefined
  if (profundidade !== 'simples') {
    onStatusHint('A planear execução…')
    plano = await planejadorIde({ mensagem, snapshot, memorias })
  }

  // 4. Montar system prompt (identidade + personalidade + memória + workspace)
  const systemPrompt = montarSystemPromptAgente({
    instrucaoBase: carregarInstrucaoSistema(),
    blocoPersonalidade: gerarBlocoPersonalidade(),
    memorias,
    plano,
    snapshot: opcoes.snapshotWorkspace,
  })

  // 5. Executor agêntico
  onStatusHint('A executar no workspace…')
  const resultadoExec = await executorAgentico({
    mensagemUsuario: mensagem,
    systemPrompt,
    ferramentas: FERRAMENTAS_IDE,
    toolExecutor: opcoes.toolExecutor,
    plano,
    maxRodadas: opcoes.maxRodadas ?? 10,
    onToolCallStart: opcoes.onToolCallStart,
    onToolCallComplete: opcoes.onToolCallComplete,
    onStatusHint: opcoes.onStatusHint,
    abortSignal: opcoes.abortSignal,
  })

  // 6. Avaliador (só complexo/crítico)
  let avaliacao: ResultadoAvaliador | undefined
  if (profundidade === 'complexo' || profundidade === 'critico') {
    onStatusHint('A verificar resultado…')
    avaliacao = await avaliadorTarefa({
      objetivo: plano?.objetivo ?? mensagem,
      mensagemOriginal: mensagem,
      passos: resultadoExec.passos,
      respostaExecutor: resultadoExec.resposta_final,
    })

    // Nova rodada se necessário
    if (!avaliacao.concluido && avaliacao.sugestao_nova_rodada) {
      // re-executa com sugestao como mensagem adicional
      // (máx 1 retry para evitar loop)
    }
  }

  // 7. Respondedor — resposta humana (reutiliza responderLuna existente, adaptado)
  onStatusHint('A formular resposta…')
  const resposta = await responderLunaAgente({
    mensagemOriginal: mensagem,
    passos: resultadoExec.passos,
    respostaExecutor: resultadoExec.resposta_final,
    avaliacao,
    sessao,
  })

  // 8. Memória pós-turno (async, não bloqueia a resposta)
  registrarTurnoAssync(sessao, mensagem, resposta)

  return { resposta, passos: resultadoExec.passos, plano, avaliacao, sessao, ... }
}
```

### Export em `entry-desktop.ts`

```typescript
export {
  executarAgenteIde,
  type OpcoesPipelineIde,
  type ResultadoAgenteIde,
  type PassoExecucao,
} from './pipeline/executarAgenteIde.js'
```

### Testes de integração

`tests/pipelineAgenteIde.test.ts`:
- Mock completo do toolExecutor → pipeline roda do início ao fim
- Pedido simples → planejador e avaliador não são chamados
- Pedido complexo → todos os neurônios ativados
- Abort signal → pipeline cancela no próximo checkpoint

---

## A3.6 — Integração Orbit

**Objetivo:** Conectar o novo pipeline Core ao Forge via IPC, com tool executor que usa os tools reais do filesystem.

### A3.6.1 — Tool Executor no Electron Main

`electron/lunaCoreBridge.cjs` — novo handler:

```javascript
async function executarAgenteIde(mensagem, opcoes) {
  const { executarAgenteIde } = await getLunaCoreModule()

  return await executarAgenteIde(mensagem, {
    ...opcoes,
    toolExecutor: async (nome, args) => {
      // Delega para handlers do Forge registrados no main
      return await executarFerramenta(nome, args)
    },
  })
}
```

`electron/forgeToolHandlers.cjs` — implementa cada ferramenta:
- `read_file` → `fs.readFile`
- `write_file` → `fs.writeFile` + notifica renderer (para atualizar editor)
- `apply_patch` → `applyUnifiedDiff` (lib existente ou nova)
- `list_directory` → `fs.readdir` recursivo com filtros
- `glob` → `fast-glob`
- `grep` → `ripgrep` via `execFile`
- `run_terminal_command` → PTY no workspace root (integrar com terminal existente)
- `git_status / git_diff / git_commit` → `simple-git`
- `search_codebase` → RAG existente do Orbit

### A3.6.2 — IPC

`electron/main.cjs`:
```javascript
ipcMain.handle('lunaCore:executarAgenteIde', async (_, mensagem, opcoes) => {
  // opcoes inclui snapshotWorkspace (serializado do renderer)
  // callbacks onToolCallStart, onToolCallComplete → enviados via webContents.send
  return await bridge.executarAgenteIde(mensagem, opcoes)
})
```

`electron/preload.cjs`:
```javascript
executarAgenteIde: (mensagem, opcoes) =>
  ipcRenderer.invoke('lunaCore:executarAgenteIde', mensagem, opcoes),

// Para receber eventos de progresso em tempo real:
onToolCallStart: (callback) => ipcRenderer.on('forge:toolCallStart', callback),
onToolCallComplete: (callback) => ipcRenderer.on('forge:toolCallComplete', callback),
onStatusHint: (callback) => ipcRenderer.on('forge:statusHint', callback),
```

### A3.6.3 — Simplificar Orbit

**`src/features/chat/useIdeHybridTurn.ts`** — simplificar radicalmente:

```typescript
// Antes: runLunaCoreTurn → shouldContinueToForgeAgent → runForgeAgentTurn
// Depois: uma chamada só ao novo pipeline

const resultado = await window.lunaCore.executarAgenteIde(trimmed, {
  snapshotWorkspace: host.getSnapshot(),
  sessaoId: conversa.lunaSessaoId,
})
// atualiza UI com resultado.resposta + resultado.passos
```

**Remover (ou arquivar):**
- `src/features/ide/runForgeAgentTurn.ts`
- `src/features/chat/ideAgentTurnRunner.ts` (substitído pelo Core)
- `src/features/ide/forgeAgentInterpreter.ts` (lógica migra para o Core)
- `src/lib/compileIdeContextForTurn.ts` (snapshot agora vai direto para o Core)

### Testes Orbit

`src/features/chat/useIdeHybridTurn.test.ts`:
- Mock `window.lunaCore.executarAgenteIde` → assert UI atualizada corretamente
- Mock com `passos` populados → assert agent steps visíveis na mensagem
- Mock com abort → assert mensagem de cancelamento

---

## A3.7 — Validação e testes end-to-end

**Critérios de sucesso do pipeline completo:**

| Cenário | Comportamento esperado |
|---|---|
| "o que faz a função X?" | Lê arquivo, responde sem editar — 1 rodada |
| "adiciona um log no início da função Y do arquivo Z" | Lê → edita com apply_patch → confirma |
| "roda os testes e me diz o que falhou" | Executa terminal → lê output → responde |
| "refatora o módulo X para usar async/await" | Lê múltiplos arquivos → edita → roda build → verifica |
| "faz commit das mudanças" | git_status → git_commit (pendente na UI) |
| Pedido destrutivo ("deleta o projeto") | Planejador sinaliza `requer_confirmacao: true` → respondedor pede confirmação explícita |
| Sem workspace aberto | Responde orientando abrir uma pasta |

**Suite de validação empírica** (`tests/empirico-agente.ts`):
Mesma estrutura que `casos.ts` do V2, mas para cenários IDE.
`npm run empirico:agente` — relatório visual ✓/✗/~.

---

## Sequência de desenvolvimento recomendada

```
Semana 1:
  A3.1 provider tool calling (Core)
  → testes unitários do provider
  → validação manual com LM Studio / Groq que suportam tools

Semana 2:
  A3.2 planejador (Core)
  A3.3 executor agêntico (Core)
  → testes unitários de cada neurônio isolado

Semana 3:
  A3.4 avaliador (Core)
  A3.5 pipeline executarAgenteIde (Core)
  → testes de integração do pipeline completo com mocks

Semana 4:
  A3.6 integração Orbit (bridge + IPC + useIdeHybridTurn)
  → testes end-to-end com workspace real

Semana 5:
  A3.7 validação + suite empírica
  → polish, casos extremos, documentação
```

---

## Decisões arquiteturais chave

| Decisão | Alternativa descartada | Motivo |
|---|---|---|
| **Planejador usa `modeloMaior`** | Planejador no modelo menor | Código exige precisão; plano ruim gera mais rodadas de correção que custam mais no total |
| **Avaliador usa `modeloMenor`** | Avaliador no modelo maior | Verificação booleana — modelo menor suficiente, economiza tokens |
| Planejador separado do executor | Executor planeja e executa | Executor foca; plano melhora qualidade e reduz rodadas |
| Tool definitions no Core | Tool definitions no Orbit | Core controla o contrato; Orbit é só executor |
| Callbacks de progresso (não polling) | Polling do Orbit | Latência menor, IPC mais limpo |
| Avaliador só em complexo/crítico | Avaliador sempre | Custo/latência; pedidos simples não precisam |
| `executarPipelineCompleto` intocado | Unificar tudo | Retrocompatibilidade; chat funciona independente |
| Tálamo reutilizado sem mudança | Tálamo especializado para IDE | Já classifica bem; estender se necessário depois |

---

## Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Modelo menor não suporta tool calling | Alta (LM Studio 7B) | Planejador usa JSON puro (sem tools); só executor precisa de tool calling |
| Groq token limit com contexto grande | Alta | Contexto do workspace truncado por relevância; RAG em vez de dump completo |
| Loop infinito no executor | Média | `maxRodadas` com failsafe + avaliador para em 2 retries |
| Tool executor retorna erro | Baixa | Executor trata erro como resultado de ferramenta, informa o modelo, continua |
| Latência alta (3+ LLMs) | Alta com modelo grande local | Tálamo decide quando usar cada neurônio; pedidos simples custam 1 chamada |

---

## Relação com V3 existente no Core

O V3 já começou (`preditivo/`, `perfil/`). Esta fase expande V3 com a parte "Agentes locais":

```
V3.1 — Prior preditivo           ✅ Concluído (analisadorPreditivo.ts)
V3.2 — Perfil comportamental     ✅ Concluído (gerenciadorPerfil.ts)
V3.3 — Provider tool calling     ⬜ A3.1
V3.4 — Neurônio Planejador IDE   ⬜ A3.2
V3.5 — Executor Agêntico         ⬜ A3.3
V3.6 — Neurônio Avaliador        ⬜ A3.4
V3.7 — Pipeline executarAgenteIde⬜ A3.5
V3.8 — Integração Orbit          ✅ A3.6
```

---

## Próxima ação

**Começar por A3.1** — extensão do provider para tool calling.

Arquivo: `src/providers/tipos.ts` (adicionar tipos) + `src/providers/openaiCompativel.ts` (implementar `completarComFerramentas`).

Validar com LM Studio ou Groq que suporta tool calling antes de prosseguir.

---

*Criado em: 2026-06-10 · Responsável: Ethan Noward*
