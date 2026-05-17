# Luna — especificação do “cérebro” v1 (modo agente)

Documento de referência: Electron + Vite + **Together** (`deepseek-ai/DeepSeek-V4-Pro`) com **fallback Groq** (`openai/gpt-oss-120b`), com **uma Luna** que escolhe ferramentas por turno (não multi-agente na v1).

## 1. Arquitectura do turno

```
sendMessage / redo
  → runAgentTurn (até MAX_AGENT_STEPS = 8)
      → Together chat + tool schemas
      → executeTools (cada tool)
      → repetir até texto final ou limite
  → persistir mensagem + agentSteps + visionDescription (se describe_images)
```

Ficheiros principais: `src/agent/runAgentTurn.ts`, `executeTools.ts`, `toolSchemas.ts`, `buildAgentSystemPrompt.ts`, integração em `src/hooks/useConversations.ts`.

## 2. Percepção (entrada)

| Fonte | Comportamento v1 |
| --- | --- |
| Texto do utilizador | Sempre no turno. |
| Imagens (até 5) | Hint no conteúdo do user; **não** há visão obrigatória pré-chat. A Luna chama `describe_images` se precisar. |
| Conversa activa | `verbatimWorking` + fronteira de resumo. |
| RAG / recall / memória global | **Só via tools** (`search_documents`, `search_past_conversations`, `save_memory`) — não inject automático no system no envio. |
| Sistema base | Manifesto + perfil Conversa/Técnico + suplemento agente (`agentSystemSupplement.ts`). |

## 3. Ferramentas v1

| Tool | Onde executa |
| --- | --- |
| `save_memory` | Renderer (`executeTools` → `saveMemoryTool`) |
| `search_documents` | RAG (`ragClient`) |
| `search_past_conversations` | Recall semântico (`chatMemoryClient`) |
| `describe_images` | Together vision (`togetherClient`) |
| `list_directory`, `read_file` | IPC Electron (`electron/agentTools.cjs`, allowlist) |
| `web_search` | Main process (Tavily; `WEB_SEARCH_API_KEY` / `TAVILY_API_KEY`) |

Labels de UI: `TOOL_UI_LABELS` em `toolSchemas.ts`. Passos registados em `Message.agentSteps`.

## 4. Política e memória activa

- Editorial: `lunaManifesto.ts`, `lunaModelSystemPrompt.ts`.
- Resumo rolante / compactação: inalterado (`lunaMemory.ts`, `useConversations`); system de compactação **sem** RAG/recall automático.
- Planeamento JSON opcional: `luna-use-planning` no `localStorage`; por defeito desligado no fluxo agente.

## 5. UI

- Resposta da assistente: markdown + badge de memória (legado) + citações RAG (se a tool as devolver) + **“Ferramentas usadas”** (`details` com `agentSteps`).
- Mensagem do utilizador com imagem: `visionDescription` em `details` após `describe_images`.

## 6. Configuração

Ver `.env.example`: `LLM_PRIMARY`, `LLM_FALLBACK_ENABLED`, `TOGETHER_API_KEY`, `GROQ_API_KEY`, `WEB_SEARCH_PROVIDER=tavily`.

## 7. Falhas e fallback

- Limite de passos: última resposta de texto ou mensagem de limite.
- Tool falha: passo com `ok: false` no histórico; o modelo pode continuar.
- Plano inválido: ignorado.
- `web_search` sem chave: erro explícito na tool.

## Roadmap *Her*-adjacente (pós–v1 agente)

1. Streaming da resposta principal.
2. Proactividade leve com opt-in.
3. Voz (TTS/STT).

Não fazem parte do modo agente v1 acima.
