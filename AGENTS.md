# AGENTS.md

## Cursor Cloud specific instructions

Luna (pacote `orbit`) é um app desktop **Electron + React (Vite) + backend Python (FastAPI)**. O fluxo de dev sobe 3 processos em paralelo via `npm run dev` (ver scripts em `package.json` e o README). Portas: backend `39281`, Vite `5173`, Electron abre depois que ambos respondem.

Detalhes não óbvios (o setup padrão de dependências já é feito pelo update script na inicialização):

- **`.env` é necessário para rodar** e é gitignored. Copie de `.env.example` (`cp .env.example .env`) se não existir. O update script já faz isso automaticamente quando o arquivo está ausente.
- **Chat com IA ("Luna Core / FAIA") depende de repositório externo.** O modo Chat usa o motor Luna Core via `LUNA_CORE_PATH`, que aponta para um repositório **separado** (`../../Core/Luna/src/luna-core`) que **não faz parte deste projeto**. Sem ele (ou com o caminho Windows padrão do `.env.example`), o chat retorna erro de diretório inexistente. Para respostas de IA reais é preciso clonar/compilar o Luna Core e/ou fornecer chave de LLM (Groq/OpenRouter) — ou rodar Ollama/LM Studio local em `http://127.0.0.1:1234/v1`.
- **Scripts `npm run server` e `server:watch` têm caminho Windows hardcoded** (`backend\.venv\Scripts\python.exe`). No Linux, rode o backend com `backend/.venv/bin/python backend/run_server.py`, ou simplesmente use `npm run dev` (o helper `scripts/start-server-if-needed.cjs` resolve o Python de forma multiplataforma). Health check: `GET http://127.0.0.1:39281/health`.
- **Ferramentas de agente do backend funcionam sem LLM** (arquivos, git, grep, terminal) via `POST /v1/tools/*` — úteis para verificação ponta a ponta sem chaves.
- **Endpoints que exigem chave:** `/v1/translate` (precisa `GOOGLE_TRANSLATE_API_KEY`); embeddings de RAG/memória e chat multi-LLM precisam de um provedor de LLM configurado.
- **Electron em VM headless:** requer um X server (ex.: `DISPLAY=:1`). Erros de `dbus`/GPU no log são inofensivos. Pode ser necessário desabilitar o sandbox (`ELECTRON_DISABLE_SANDBOX=1`).
- **Lint:** `npm run lint` roda, mas o repositório tem erros de lint pré-existentes; portanto `npm run ci` (lint + build + test) falha no passo de lint. Testes (`npm test`, Vitest) e build (`npm run build`) passam.
