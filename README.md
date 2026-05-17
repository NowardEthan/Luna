# Luna

Assistente de IA para desktop com chat, IDE integrado, agente e memória. Electron, React e Python. Projeto Lunar.

## Requisitos

- [Node.js](https://nodejs.org/) 20+
- [Python](https://www.python.org/) 3.11+ (servidor local)
- Windows (scripts `dev.bat` / `dev-stop.bat`)

## Configuração

```bash
npm install
npm run server:install
copy .env.example .env
```

Edite `.env` com suas chaves de API (OpenRouter, Groq, etc.). O arquivo `.env` **não** é versionado.

## Desenvolvimento

```bash
dev.bat
```

Ou manualmente:

```bash
npm run dev
```

Para encerrar os processos de desenvolvimento: `dev-stop.bat`.

## Estrutura

| Pasta | Descrição |
|-------|-----------|
| `src/` | Interface React (chat, IDE, agente) |
| `electron/` | App desktop Electron |
| `backend/` | Servidor Python (memória, RAG, bridge) |
| `scripts/` | Utilitários de dev e instalação |

## Licença

Projeto pessoal — consulte o autor antes de redistribuir.
