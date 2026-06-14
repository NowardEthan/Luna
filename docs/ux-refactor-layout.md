# UX Refactor — Layout & Navegação

> Sessão iniciada em 2026-06-09. Documento de referência para retomar caso os tokens acabem.

---

## Problema atual

O shell do app tem **três colunas de navegação** à esquerda:

| Componente | Largura | O que faz |
|---|---|---|
| `ActivityBar` | 48 px | Chat, IDE, Marketplace, Finanças, Conta, Definições |
| `ContextRail` | 48 px | Nova conversa, Histórico, Memórias, Foco |
| `Sidebar` (HistoryPanel / MemoriesPanel) | 0–288 px | Lista de conversas ou notas de memória |

Problemas:
- 96 px de rails só com ícones sem label → péssima descoberta
- Sidebar escondida por padrão → usuário tem de descobrir via ícone sem label
- Mental model de IDE (VSCode-style) aplicado a um chat app
- Visual desconexo: ActivityBar e ContextRail parecem dois componentes sem relação

---

## Solução — `AppSidebar` unificado

Substituir os três por **um único painel lateral** de 240 px:

```
┌────────────────────────┐
│ ✦ Luna       [+] Novo  │  ← header (logo + nova conversa)
│  [Chat] [IDE]          │  ← mode tabs (só se IDE addon ativo)
├────────────────────────┤
│ [Histórico] [Memórias] │  ← tab switcher
├────────────────────────┤
│                        │
│  (conteúdo do painel   │  ← HistoryPanel ou MemoriesPanel
│   ativo — scrollável)  │
│                        │
├────────────────────────┤
│  🛒 Marketplace        │  ← nav footer
│  💰 Finanças           │  ← (só se addon ativo)
├────────────────────────┤
│ [avatar] Nome    [⚙]  │  ← user footer
│ [badge plano]          │
└────────────────────────┘
```

**Benefícios:**
- +96 px recuperados para a área de chat
- Histórico sempre visível (como Claude.ai / ChatGPT)
- Labels em todos os elementos → melhor descoberta
- Mental model de "sidebar de app", não de IDE

---

## Arquivos a criar / modificar

### 1. CRIAR `src/shell/AppSidebar.tsx` ← PASSO ATUAL
Componente novo. Props recebidos do AppShell:
- `primaryView`, `workbenchMode`, `ideAddonActive`, `financesAddonActive`
- `sidebarPanel` (controla qual tab está ativa: 'history' | 'memories' | 'none')
- `historyPanel: ReactNode`, `memoriesPanel: ReactNode`
- `onNewConversation`, `onWorkbenchModeChange`
- `onOpenMarketplace`, `onOpenFinances`, `onOpenConversation`
- `onOpenAccount`, `onTogglePreferences`, `preferencesOpen`
- Lê auth internamente via `useLunaAuth()` para o footer

### 2. MODIFICAR `src/shell/layouts/MainLayout.tsx`
- Remover prop `contextRail` (não existe mais)
- `activityBar` vira `sidebar?: ReactNode`
- Quando `compact` (modo IDE), não renderiza sidebar
- Quando sem sidebar (marketplace/finances), main ocupa tudo

### 3. MODIFICAR `src/shell/AppShell.tsx`
- Remover imports: `ActivityBar`, `ContextRail`, `SidebarLayout`
- Adicionar import: `AppSidebar`
- AppSidebar só é renderizado quando `primaryView === 'conversation' && workbenchMode !== 'ide'`
- `chatColumn` vai direto como children do MainLayout (sem SidebarLayout wrapper)
- Passar historyPanelNode e memoriesPanelNode ao AppSidebar
- Os atalhos de teclado (`toggleHistory`, `toggleMemories`) continuam funcionando — eles
  mudam `nav.sidebarPanel` que AppSidebar usa para saber qual tab mostrar

### 4. MELHORAR `src/components/ChatSessionHeader.tsx`
- Fundo `bg-canvas` em vez de `bg-sidebar` (mais leve, integra melhor)
- Remover `border-b` pesado — usar separação sutil
- Manter funcionalidade intacta (edição de título, toolbar)

---

## Estado de implementação

- [x] Documento criado
- [x] **AppSidebar.tsx criado** (`src/shell/AppSidebar.tsx`)
- [x] MainLayout.tsx modificado — prop `activityBar`/`contextRail` → `sidebar`
- [x] AppShell.tsx modificado — ActivityBar/ContextRail/SidebarLayout removidos
- [x] ChatSessionHeader.tsx melhorado — bg-canvas, border-b sutil, título mais discreto
- [x] TypeScript `npx tsc --noEmit` — zero erros
- [x] Bug fix: sidebar sempre visível — removida condição `primaryView === 'conversation'`
- [x] Bug fix: nav Chat adicionado ao bottom nav (Chat + Marketplace + Finanças)
- [x] Bug fix: logo `✦ Luna` clicável para voltar ao chat
- [x] Bug fix: sidebar mostra painel vazio em marketplace/finanças (não quebra)
- [ ] **Testado no browser** ← próximo passo manual (Ethan)

---

## O que NÃO muda

- `HistoryPanel.tsx` — apenas renderizado dentro do AppSidebar
- `MemoriesPanel.tsx` — idem
- `ChatColumn.tsx` — sem alterações
- `ChatShellFooter.tsx` — sem alterações
- `IdeWorkbench.tsx` — layout próprio, não afetado
- `MarketplacePage.tsx`, `FinancesPage.tsx` — full-screen, sem sidebar
- Todos os hooks de state (`useAppNavigation`, `useConversations`, etc.)
- Modais, overlays, preferences — não afetados

---

## Notas técnicas

- `nav.sidebarPanel` ('none' | 'history' | 'memories') continua existindo no estado
  e controla qual tab o AppSidebar mostra ('none' → default para 'history')
- `nav.toggleHistory()` e `nav.toggleMemories()` continuam funcionando como antes
  (Command Palette, atalhos de teclado)
- O ContextRail tinha um botão "Foco" (scroll para o fim + foca composer) — este
  comportamento pode ser adicionado ao ChatSessionHeader se necessário, ou descartado
- AppSidebar **não** é resizável na V1 (240 px fixo) — ResizableSplit pode ser adicionado depois

---

---

## Parte 2 — Refactor UX do IDE (Luna Forge)

> Sessão: 2026-06-09. Análise e implementação do IDE após refactor do shell.

### Problemas identificados no IDE

| Problema | Impacto | Causa |
|---|---|---|
| AI Panel aberto por padrão (38% de largura) | Alto | Default `ai: true` em forgeLayout.ts |
| Bottom Panel aberto por padrão (terminal) | Alto | Default `bottom: true` em forgeLayout.ts |
| Editor fica com ~40% do espaço disponível | Alto | Consequência dos dois acima |
| StatusBar: badge "LUNA FORGE" no centro | Médio | Redundante, workspace name deveria estar à esquerda |
| StatusBar: "Fechar Projeto" é texto plano no meio de outros controles | Médio | Ruído visual, deveria ser ícone |
| ForgeActivityBar: botão "Voltar ao Chat" sem destaque visual | Médio | Adicionado como item simples |
| ForgeSidebar: botão collapse redundante | Baixo | Pode colapsar clicando no ícone ativo da activity bar |

### O que NÃO mudar no IDE

- `EditorPanel.tsx` (825 linhas) — CodeMirror integration, funciona bem
- `ForgeTerminalPanel.tsx` — xterm.js funciona
- `FileExplorer.tsx` — funcional, não é UX crítico agora
- `ForgeSearchPanel`, `ForgeSourceControlPanel`, `ForgeOutlinePanel` — funcionais
- `ForgeEditorChrome.tsx` — tab bar + breadcrumb estão bons
- `ForgeLayoutContext.tsx` — estado correto
- `ForgeQuickOpen.tsx` — funciona

### Mudanças implementadas

**1. `src/lib/forgeLayout.ts`** — defaults melhores
- `readForgeAiPanelOpen` default: `true` → **`false`**
- `readForgeBottomOpen` default: `true` → **`false`**
- `readForgeBottomTab` default: `'terminal'` → **`'problems'`**
- Impacto: novos usuários abrem o IDE com editor em tela cheia; painéis sob demanda
- Usuários existentes mantêm suas preferências salvas no localStorage

**2. `src/components/ide/forge/ForgeStatusBar.tsx`** — layout limpo
- Remove badge "LUNA FORGE" do centro (redundante)
- Workspace name move para a esquerda (ao lado do git/problemas)
- "Fechar Projeto" vira ícone × compacto na direita
- Centro: vazio (evita atenção dividida)

**3. `src/components/ide/forge/ForgeActivityBar.tsx`** — polimento visual
- Botão "Voltar ao Chat" com separador inferior mais visível
- Visual mais integrado com o design system

**4. `src/components/ide/forge/ForgeSidebar.tsx`** — header mais limpo
- Remove botão de colapso redundante do header
- Título mais limpo

### Estado de implementação — IDE

- [x] Documentado
- [x] Corrigir defaults: AI=false, bottom=false, tab='problems'
- [x] Refatorar ForgeStatusBar: workspace na esquerda, badge removido, × ícone
- [x] Melhorar ForgeActivityBar: botão "Voltar ao Chat" em `text-accent` + hover:bg-accent/10, separador abaixo
- [x] Polir ForgeSidebar header: botão collapse removido (colapso via click no ícone ativo da activity bar)
- [x] TypeScript `npx tsc --noEmit` — zero erros
- [ ] **Testado no browser** ← próximo passo manual (Ethan)

---

## Mapa de componentes afetados

```
AppShell (MODIFY)
├── AppSidebar (CREATE) ← substituição de ActivityBar + ContextRail + SidebarLayout
│   ├── HistoryPanel (inalterado, só renderizado aqui)
│   └── MemoriesPanel (inalterado)
├── MainLayout (MODIFY) — simplificado
├── ChatColumn (inalterado)
├── IdeWorkbench (inalterado)
├── MarketplacePage (inalterado)
└── FinancesPage (inalterado)

ELIMINADOS:
- ActivityBar.tsx (arquivo mantido mas não mais importado no AppShell)
- ContextRail.tsx (arquivo mantido mas não mais importado no AppShell)
- SidebarLayout.tsx (arquivo mantido mas não mais usado no fluxo principal)
```
