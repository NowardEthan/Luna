# Luna Forge — Roadmap Cursor-like

> Objetivo: tornar o Luna Forge um IDE integrado no Orbit com layout, design e mecânica inspirados no [Cursor](https://cursor.com), mantendo a identidade Luna e o Luna Core (PAIA) como motor de IA.

**Estado geral:** Fases 1–5 concluídas (tab completion IA deferida); F6 em progresso (~93% global). Última atualização: 2026-06-09.

---

## Referência de layout (Cursor / VS Code)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ TitleBar (Orbit / Electron)                                              │
├──┬──┬─────────────────────────────────────────────┬───────────────────────┤
│O │F │ [Tabs] [Breadcrumbs]                       │                       │
│r │o │ ┌─────────────────────────────────────────┐ │   Painel Luna (IA)   │
│b │r │ │              Editor                     │ │   — chat + composer  │
│i │g │ └─────────────────────────────────────────┘ │                       │
│t │e │ [Problemas | Saída | Terminal | Debug]      │                       │
│  │  ├─────────────────────────────────────────────┤                       │
│  │  │ Status bar (branch, erros, Ln/Col, UTF-8)    │                       │
└──┴──┴─────────────────────────────────────────────┴───────────────────────┘

Orbit Activity Bar (global): Chat | Forge | Marketplace | Finanças | Settings
Forge Activity Bar (interna): Explorer | Search | Git | — | Chats | Memórias | Luna
```

---

## Fase 1 — Shell & layout (✅ concluída)

| Item | Estado | Notas |
|------|--------|-------|
| Activity bar interna (Explorer, Search, Git, Chats, Memórias, AI) | ✅ | `ForgeActivityBar.tsx` |
| Sidebar primária com toggle (clicar ícone = abrir/fechar) | ✅ | Persistência em `localStorage` |
| Editor com tabs estilo Cursor + breadcrumbs | ✅ | `ForgeEditorChrome.tsx` |
| Painel inferior com abas (Problemas, Saída, Terminal, Debug) | ✅ | Terminal integrado; outras abas placeholder |
| Painel IA à direita, colapsável | ✅ | Chat Luna Core existente |
| Status bar (Ln/Col, alterações, problemas, toggles) | ✅ | `ForgeStatusBar.tsx` |
| Layout edge-to-edge no workbench | ✅ | `MainLayout compact` |
| Remover ContextRail duplicado no modo IDE | ✅ | Controlos migrados para Forge |
| Tela inicial Luna Forge (sem projecto) | ✅ | Já existia |
| **AppSidebar unificado** no shell principal | ✅ | ActivityBar + ContextRail + SidebarLayout → `AppSidebar.tsx` (240 px, sempre visível) |
| Navegação "Voltar ao Chat" do IDE | ✅ | `onSwitchToChat` propagado Forge → ForgeActivityBar + LunaForgeHome |

**Ficheiros principais:** `src/components/ide/forge/*`, `src/context/ForgeLayoutContext.tsx`, `src/lib/forgeLayout.ts`, `src/shell/AppSidebar.tsx`

---

## Fase 2 — Sidebar & navegação (✅ concluída)

| Item | Estado | Notas |
|------|--------|-------|
| Pesquisa global no projecto | ✅ | `ForgeSearchPanel` — grep nativo, regex, replace |
| Painel Git completo | ✅ | Branch, staged/changes/untracked, diff, commit |
| Explorador: CRUD de ficheiros | ✅ | Novo/renomear/eliminar + menu de contexto |
| Outline / símbolos | ✅ | Parser leve TS/JS — `ForgeOutlinePanel` |
| Atalhos de teclado IDE | ✅ | `Ctrl+P`, `Ctrl+Shift+F/E/G`, `` Ctrl+` ``, `Ctrl+B`, `Ctrl+J` |
| Command palette IDE | ✅ | 8 comandos `forge:*` registados |
| Multi-root workspace | ✅ | `workspaceConfig.ts` — várias pastas; Git na pasta principal |

---

## Fase 3 — Editor avançado (✅ concluída)

| Item | Estado | Notas |
|------|--------|-------|
| Guardar ficheiro (`Ctrl+S`) | ✅ | `saveActiveFile` + `Ctrl+Shift+S` guardar todos |
| Confirmar ao fechar tab dirty | ✅ | `requestConfirm` no `closeTab` |
| Diagnostics (Problems reais) | ✅ | `@codemirror/lint` + LSP `publishDiagnostics` |
| Formatação (`Shift+Alt+F`) | ✅ | Prettier via `bridgeAgentRunCommand` |
| Folding | ✅ | `foldGutter` no CodeMirror |
| Autocomplete básico | ✅ | `@codemirror/autocomplete` (fallback) |
| IntelliSense / LSP | ✅ | `typescript-language-server` — completion, hover, F12 |
| Diff inline no editor | ✅ | Banner + gutter accept/reject em `forgeInlineDiff.ts` |
| Split editor | ✅ | `Ctrl+\\` — `ForgeEditorArea` + dois painéis |
| Minimap | ✅ | `@replit/codemirror-minimap` (toggle na palette) |

---

## Fase 4 — Terminal & painéis (✅ concluída)

| Item | Estado | Notas |
|------|--------|-------|
| Terminal PTY interactivo | ✅ | `node-pty` + xterm `onData` — PowerShell/bash no workspace |
| Múltiplos terminais | ✅ | Abas `+` no painel Terminal |
| Painel Output | ✅ | Canais Agente / Build / Luna — `forgeOutputStore` |
| Painel Debug | ✅ | Placeholder (DAP futuro) |

---

## Fase 5 — IA estilo Cursor (✅ concluída, exceto tab completion)

| Item | Prioridade | Estado | Notas |
|------|------------|--------|-------|
| Luna Core no IDE | — | ✅ | `useIdeHybridTurn` — Core + agente |
| Loop de ferramentas IDE | Alta | ✅ | I5.6 — `shouldRunIdeAgentLoop` → `runIdeAgentTurnRunner` |
| `@mentions` no composer | Alta | ✅ | `useIdeComposerMentions` + `IdeMentionPicker` no Forge |
| Composer dedicado Forge | Média | ✅ | Toggle Agente/Chat + `forgeAgentInterpreter.ts` (rotas do turno) |
| Camada interpretação Agente | Alta | ✅ | Core sempre → handoff agente (modo Agente) com tools |
| Inline edit (`Ctrl+K`) | Média | ✅ | `ForgeInlineEditBar` + `runForgeInlineEdit` → `proposePatch` |
| Tab completion (Copilot-like) | Baixa | ⬜ | Sugestões ghost text via Luna Core — deferido |
| Review de alterações unificado | Média | ✅ | Problems com accept/reject; auto-open patch; gutter existente |

---

## Fase 6 — Polish & identidade (~40%)

| Item | Prioridade | Estado | Notas |
|------|------------|--------|-------|
| ForgeStatusBar reescrita | Média | ✅ | Workspace na esquerda, badge central removido, × ícone compacto |
| ForgeActivityBar polish | Média | ✅ | Botão "Voltar ao Chat" em `text-accent`, separador visual |
| ForgeSidebar header limpo | Baixa | ✅ | Botão collapse redundante removido |
| Defaults melhores (AI=false, bottom=false) | Alta | ✅ | Novos usuários abrem o IDE com editor em tela cheia |
| Tema Forge refinado | Média | ⬜ | Cores, densidade, animações subtis |
| Zen mode / fullscreen editor | Baixa | ⬜ | Ocultar todos os painéis |
| Onboarding Forge | Baixa | ⬜ | Tour na primeira abertura de projecto |
| Empacotamento addon `luna-ide` | Média | ⬜ | I6 — distribuição standalone opcional |
| Documentação utilizador | Média | ⬜ | Guia PT/EN no Orbit docs |

---

## Métricas de progresso

| Fase | Peso | Progresso |
|------|------|-----------|
| F1 Shell & layout | 20% | **100%** |
| F2 Sidebar & navegação | 20% | **100%** |
| F3 Editor avançado | 20% | **100%** |
| F4 Terminal & painéis | 15% | **100%** |
| F5 IA estilo Cursor | 20% | **95%** (tab completion deferida) |
| F6 Polish | 5% | **40%** |
| **Total ponderado** | | **~93%** |

---

## Próximos passos recomendados

1. **F6** — tema refinado (cores, densidade, animações) + onboarding Forge.
2. **F5+** — tab completion Copilot-like (ghost text via Luna Core).
3. **F6** — zen mode + empacotamento addon `luna-ide`.
4. **I5.5** — avaliar desativação do servidor Python (Core + Orbit tools cobrem 100%?).
5. **I6** — empacotamento reproduzível, sem paths hardcoded.

---

## Decisões de arquitectura

- **Navegação de dois níveis:** shell usa `AppSidebar` (240 px, sempre visível, labels em tudo); IDE usa `ForgeActivityBar` (48 px, ícones Cursor-like) — contextos diferentes, modelos mentais diferentes.
- **AppSidebar unificado** substituiu ActivityBar (48 px) + ContextRail (48 px) + SidebarLayout — ganho líquido de 96 px de largura de conteúdo.
- **Estado de layout** em `ForgeLayoutContext` com persistência `localStorage` — não misturar com `useAppNavigation`.
- **Defaults conservadores** em `forgeLayout.ts`: AI=false, bottom=false, tab='problems' — novos usuários veem o editor em tela cheia; usuários existentes mantêm preferências do localStorage.
- **Luna Core** permanece o único LLM no IDE; finanças mantém stack legada até migração.
- **ResizableSplit** com `storageKey` por painel — rácios sobrevivem a reload.
