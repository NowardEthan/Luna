# Changelog

Todas as alterações notáveis do projeto **Luna** estão documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e o histórico de commits está na seção [Registro de commits](#registro-de-commits).

---

## [0.2.0] — 2026-05-19

### Commit `8004acd` — `docs: registrar commit de correção no CHANGELOG`

#### Alterado

- Entrada na tabela de registro para o commit `3f38775`

---

### Commit `3f38775` — `docs: corrigir hash do commit no CHANGELOG`

#### Corrigido

- Hash `34e8504` na tabela de registro e link de comparação no GitHub

---

### Commit `34e8504` — `feat: arquitetura modular, Lunar/Firebase, marketplace e plugins`

Grande atualização após o commit inicial público: reorganização do frontend, conta **Lunar**, nuvem Firebase e sistema de extensões.

#### Adicionado

- **Arquitetura modular:** `src/shell/`, `src/features/`, `src/core/`, `src/ui/`
- **Registries:** ferramentas, painéis, comandos, temas, definições de plugins
- **Plugins:** `PluginHost`, worker para add-ons não confiáveis, pasta `.luna/plugins/`
- **MCP:** cliente HTTP e registro de ferramentas `mcp__*`
- **Conta Lunar:** login Firebase/Google, `LunarGate`, sincronização na nuvem
- **Marketplace:** catálogo local/remoto e página de add-ons
- **Temas:** 9 variantes (`lunaThemes`), CodeMirror e xterm alinhados ao tema ativo
- **Preferências:** vista dedicada (substitui `SettingsDrawer`)
- **IDE:** picker de menções, preview de diff, checkpoints do workspace
- **Chat:** indicador de uso de contexto, aviso de compactação, blocos de código melhorados
- **Backend:** autenticação, router de tools com allowlist (`shared/tool-catalog.json`)
- **Firebase:** regras Firestore/Storage, hosting do catálogo, scripts `firebase:*`
- **Pacote** `packages/luna-sdk` para autores de plugins
- **Testes:** Vitest unitários + Playwright E2E de fumo (`npm run test:e2e`, `npm run ci`)
- **Documentação:** `docs/architecture.md`, `docs/luna-plugin-api.md`, `docs/firebase-setup.md`, `docs/contributing.md`

#### Alterado

- `App.tsx` simplificado; boot via `AppShell` e `AppProviders`
- Agente usa `ToolRegistry` em vez de monólito em `executeTools.ts`
- `useConversations` como fachada sobre stores em `features/chat/state/`
- README atualizado (segurança de plugins, docs, roadmap)
- `.env.example` com variáveis Firebase e Lunar

#### Removido

- `src/components/SettingsDrawer.tsx` (substituído por preferências em `features/settings/`)
- Servidor Node legado marcado como obsoleto (`server/app.cjs` — usar só Python)

#### Corrigido

- Fluxo OAuth Google no Electron (`electron/googleOAuth.cjs`)
- Sincronização de ambiente Firebase (`scripts/sync-firebase-env.cjs`)

---

## [0.1.0] — 2026-05-19

### Commit `b099b05` — `fix: corrigir sintaxe dos diagramas Mermaid no README`

#### Corrigido

- Bloco `loop` do diagrama de sequência sem `end` (GitHub não renderizava)
- Flowchart simplificado para compatibilidade com o parser do GitHub

---

### Commit `7925b5a` — `docs: README completo em pt-BR com arquitetura e guias`

#### Adicionado

- README expandido: índice, arquitetura, ferramentas, API, instalação
- Diagramas Mermaid (camadas + turno do agente)
- Documentação em português brasileiro

---

### Commit `b61a86f` — `merge: integrar histórico remoto e README completo`

#### Alterado

- Merge do README inicial do GitHub com o repositório local

---

### Commit `2c5389a` — `feat: commit inicial da Luna v1 (Electron, React e servidor Python)`

#### Adicionado

- Aplicação desktop **Electron 39** + **React 19** + **Vite 8**
- Servidor **FastAPI** (`backend/luna/`) na porta `39281`
- Modos **Chat** e **IDE** (CodeMirror, xterm, explorer)
- Agente com ferramentas (`runAgentTurn`, até 8 passos no chat)
- Memória do usuário, RAG, Lunar Vision, pesquisa web (Tavily)
- Provedores LLM: OpenRouter, Groq, Together, Ollama
- Scripts `dev.bat`, `dev-stop.bat`, `npm run server:install`
- Documentação `docs/luna-brain-v1-spec.md`, `docs/luna-ide-tools.md`
- `.env.example`, `.gitignore`, `.lunaignore`

---

### Commit `b886bea` — `Initial commit`

#### Adicionado

- Repositório GitHub com README mínimo e descrição do projeto

---

## Registro de commits

| Hash | Data | Mensagem |
|------|------|----------|
| `8004acd` | 2026-05-19 | docs: registrar commit de correção no CHANGELOG |
| `3f38775` | 2026-05-19 | docs: corrigir hash do commit no CHANGELOG |
| `34e8504` | 2026-05-19 | feat: arquitetura modular, Lunar/Firebase, marketplace e plugins |
| `b099b05` | 2026-05-19 | fix: corrigir sintaxe dos diagramas Mermaid no README |
| `7925b5a` | 2026-05-19 | docs: README completo em pt-BR com arquitetura e guias |
| `b61a86f` | 2026-05-19 | merge: integrar histórico remoto e README completo |
| `2c5389a` | 2026-05-19 | feat: commit inicial da Luna v1 (Electron, React e servidor Python) |
| `b886bea` | 2026-05-19 | Initial commit |

> Para commits mais recentes: `git log --oneline`

---

[0.2.0]: https://github.com/NowardEthan/Luna/compare/b099b05...8004acd
[0.1.0]: https://github.com/NowardEthan/Luna/compare/b886bea...b099b05
