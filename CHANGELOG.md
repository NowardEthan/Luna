# Changelog

Todas as alteraÃ§Ãµes notÃ¡veis do projeto **Luna** estÃ£o documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e o histÃ³rico de commits estÃ¡ na seÃ§Ã£o [Registro de commits](#registro-de-commits).

---

## [0.2.0] â€” 2026-05-19

### Commit `34e8504` — `feat: arquitetura modular, Lunar/Firebase, marketplace e plugins`

Grande atualizaÃ§Ã£o apÃ³s o commit inicial pÃºblico: reorganizaÃ§Ã£o do frontend, conta **Lunar**, nuvem Firebase e sistema de extensÃµes.

#### Adicionado

- **Arquitetura modular:** `src/shell/`, `src/features/`, `src/core/`, `src/ui/`
- **Registries:** ferramentas, painÃ©is, comandos, temas, definiÃ§Ãµes de plugins
- **Plugins:** `PluginHost`, worker para add-ons nÃ£o confiÃ¡veis, pasta `.luna/plugins/`
- **MCP:** cliente HTTP e registo de ferramentas `mcp__*`
- **Conta Lunar:** login Firebase/Google, `LunarGate`, sincronizaÃ§Ã£o na nuvem
- **Marketplace:** catÃ¡logo local/remoto e pÃ¡gina de add-ons
- **Temas:** 9 variantes (`lunaThemes`), CodeMirror e xterm alinhados ao tema ativo
- **PreferÃªncias:** vista dedicada (substitui `SettingsDrawer`)
- **IDE:** picker de menÃ§Ãµes, preview de diff, checkpoints do workspace
- **Chat:** indicador de uso de contexto, aviso de compactaÃ§Ã£o, blocos de cÃ³digo melhorados
- **Backend:** autenticaÃ§Ã£o, router de tools com allowlist (`shared/tool-catalog.json`)
- **Firebase:** regras Firestore/Storage, hosting do catÃ¡logo, scripts `firebase:*`
- **Pacote** `packages/luna-sdk` para autores de plugins
- **Testes:** Vitest unitÃ¡rios + Playwright E2E de fumo (`npm run test:e2e`, `npm run ci`)
- **DocumentaÃ§Ã£o:** `docs/architecture.md`, `docs/luna-plugin-api.md`, `docs/firebase-setup.md`, `docs/contributing.md`

#### Alterado

- `App.tsx` simplificado; boot via `AppShell` e `AppProviders`
- Agente usa `ToolRegistry` em vez de monÃ³lito em `executeTools.ts`
- `useConversations` como fachada sobre stores em `features/chat/state/`
- README atualizado (seguranÃ§a de plugins, docs, roadmap)
- `.env.example` com variÃ¡veis Firebase e Lunar

#### Removido

- `src/components/SettingsDrawer.tsx` (substituÃ­do por preferÃªncias em `features/settings/`)
- Servidor Node legado marcado como obsoleto (`server/app.cjs` â€” usar sÃ³ Python)

#### Corrigido

- Fluxo OAuth Google no Electron (`electron/googleOAuth.cjs`)
- SincronizaÃ§Ã£o de ambiente Firebase (`scripts/sync-firebase-env.cjs`)

---

## [0.1.0] â€” 2026-05-19

### Commit `b099b05` â€” `fix: corrigir sintaxe dos diagramas Mermaid no README`

#### Corrigido

- Bloco `loop` do diagrama de sequÃªncia sem `end` (GitHub nÃ£o renderizava)
- Flowchart simplificado para compatibilidade com o parser do GitHub

---

### Commit `7925b5a` â€” `docs: README completo em pt-BR com arquitetura e guias`

#### Adicionado

- README expandido: Ã­ndice, arquitectura, ferramentas, API, instalaÃ§Ã£o
- Diagramas Mermaid (camadas + turno do agente)
- DocumentaÃ§Ã£o em portuguÃªs brasileiro

---

### Commit `b61a86f` â€” `merge: integrar histÃ³rico remoto e README completo`

#### Alterado

- Merge do README inicial do GitHub com o repositÃ³rio local

---

### Commit `2c5389a` â€” `feat: commit inicial da Luna v1 (Electron, React e servidor Python)`

#### Adicionado

- AplicaÃ§Ã£o desktop **Electron 39** + **React 19** + **Vite 8**
- Servidor **FastAPI** (`backend/luna/`) na porta `39281`
- Modos **Chat** e **IDE** (CodeMirror, xterm, explorer)
- Agente com ferramentas (`runAgentTurn`, atÃ© 8 passos no chat)
- MemÃ³ria do usuÃ¡rio, RAG, Lunar Vision, pesquisa web (Tavily)
- Provedores LLM: OpenRouter, Groq, Together, Ollama
- Scripts `dev.bat`, `dev-stop.bat`, `npm run server:install`
- DocumentaÃ§Ã£o `docs/luna-brain-v1-spec.md`, `docs/luna-ide-tools.md`
- `.env.example`, `.gitignore`, `.lunaignore`

---

### Commit `b886bea` â€” `Initial commit`

#### Adicionado

- RepositÃ³rio GitHub com README mÃ­nimo e descriÃ§Ã£o do projeto

---

## Registro de commits

| Hash | Data | Mensagem |
|------|------|----------|
| `34e8504` | 2026-05-19 | feat: arquitetura modular, Lunar/Firebase, marketplace e plugins |
| `b099b05` | 2026-05-19 | fix: corrigir sintaxe dos diagramas Mermaid no README |
| `7925b5a` | 2026-05-19 | docs: README completo em pt-BR com arquitetura e guias |
| `b61a86f` | 2026-05-19 | merge: integrar histÃ³rico remoto e README completo |
| `2c5389a` | 2026-05-19 | feat: commit inicial da Luna v1 (Electron, React e servidor Python) |
| `b886bea` | 2026-05-19 | Initial commit |

> Para ver commits mais recentes: `git log --oneline`

---

[0.2.0]: https://github.com/NowardEthan/Luna/compare/b099b05...34e8504
[0.1.0]: https://github.com/NowardEthan/Luna/compare/b886bea...b099b05
