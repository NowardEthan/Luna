# Chat legado (multi-LLM + agente)

Arquivo de referência do modo agente com tools, raciocínio multi-fase, seletor de modelos e `agentTurnStreamSession`.

**Produção (2026):** o chat usa **Luna Core** (`useSimpleChatTurn`); IDE e Finanças usam **`agentTurnService`** via router `useChatTurn`.

Ficheiros aqui:

| Ficheiro | Descrição |
|----------|-----------|
| `agentTurnService.ts` | Turno agente com tools e streaming |
| `ChatMessageColumn.tsx` | UI com timeline / AssistantTurn |
| `ChatComposer.tsx` | Composer com `ModelSelector` e anexos |
| `ModelSelector.tsx` | Seletor multi-provider (Groq, OpenRouter, …) |
| `modelCatalogStore.ts` | Fetch de catálogo LLM no boot |

O serviço activo de chat está em `src/features/chat/useSimpleChatTurn.ts`.
