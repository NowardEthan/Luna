# Contribuir para a Luna

Obrigado por considerar contribuir. Este guia resume convenções do monorepo.

## Pré-requisitos

- Node.js 20+
- Python 3.11+ (servidor em `backend/`)
- `npm ci` na raiz

## Comandos

| Comando | Uso |
|---------|-----|
| `npm run dev` | Vite + servidor Python + Electron |
| `npm run ci` | lint + build + testes |
| `npm test` | Vitest |

## Estrutura de código

- **Não** importe `useConversations` em `src/agent/` ou `src/core/` — use `ConversationStore`.
- **Não** importe `features/` a partir de `ui/` ou `core/`.
- Ferramentas do agente: registe em `src/core/tools/handlers/` e inclua em `registerBuiltin.ts`.
- UI por domínio: prefira `src/features/<domínio>/`.

## Pull requests

1. Uma alteração lógica por PR quando possível.
2. Mensagens de commit em português ou inglês, no imperativo.
3. Execute `npm run ci` antes de abrir o PR.
4. Atualize `docs/` se mudar arquitectura, plugins ou API pública.

## Plugins

Consulte [luna-plugin-api.md](./luna-plugin-api.md) para a estrutura de `plugin.json` e da API Luna.

## Backend

A allowlist de ferramentas vive em `shared/tool-catalog.json`. Ao adicionar uma tool no frontend, actualize o catálogo e o handler em `backend/luna/tools/router.py` se a tool for invocável via HTTP.

## Dúvidas

Abra uma issue com contexto (SO, versão Node/Python, passos para reproduzir).
