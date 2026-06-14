# Luna Design System

Visual flat, sólido e vibrante (inspirado no painel Finanças / Windows 11).

## Usar

| Necessidade | Classe / helper |
|-------------|-----------------|
| Cartão neutro | `luna-card`, opcional `luna-card--hover` |
| Destaque accent | `luna-card-vivid` |
| Bloco colorido (selecção) | `lunaVividShellClass(tone, true)` — só estado activo/seleccionado |
| Secção com acento (agrupamento) | `lunaToneSectionClass(tone)` — fundo neutro + barra lateral teintada |
| Título / contador de secção | `lunaToneHeadingClass`, `lunaToneCountClass` |
| Linha de conteúdo em secção | `luna-tone-note` (sempre `text-fg` legível) |
| Nav lateral activo | `lunaNavItemClass(active)` ou `luna-nav-item--active` |
| Ícone barra lateral | `lunaIconBtnClass(active)` |
| Botão primário / secundário / fantasma | `luna-btn-primary`, `luna-btn-secondary`, `luna-btn-ghost` |
| Atenção (patch reject) | `luna-btn-warning` |
| Chip / tag | `luna-chip` |
| Modal | `luna-dialog` + `luna-overlay-scrim` |
| Fechar modal | `luna-modal-close` |
| Compositor | `luna-input-well` |
| Drop zone | `luna-drop-target` |
| Menu dropdown | `luna-select-menu` |
| Lista (histórico) | `lunaListRowClass(selected)` |
| Estado (online) | `lunaStatusDotClass('success' \| 'warning' \| 'danger')` |
| Abas IDE | `lunaTabClass(active)` |
| Empty state | `luna-empty` |
| Cloud sync (histórico) | `lunaCloudSyncBtnClass('neutral' \| 'vivid', state)` |
| Filtros (memórias) | `luna-filter-pill`, `luna-filter-pill--active` / `--idle` |
| Secções memórias por tipo | `memoryKindSectionClass(kind)` — ver hierarquia em [`memoryKinds.ts`](../src/lib/memoryKinds.ts) |
| Campos formulário | `luna-field` |
| Bolhas chat | `chat-bubble--user`, `chat-bubble--assistant` |

## Hierarquia de cor (painéis laterais)

1. **Secção** (`luna-tone-section`) — identifica o grupo (tipo de memória, pasta em repouso): barra lateral + fundo teintado ~8%.
2. **Cabeçalho** (`luna-tone-heading`) — título com cor de acento; descrição e meta em `text-fg-muted`.
3. **Conteúdo** (`luna-tone-note`, `luna-list-row`) — superfície neutra (`bg-canvas` / `bg-surface`), texto `text-fg`.
4. **Estado forte** (`lunaVividShellClass(..., true)`) — seleção, drop, destaque: bloco saturado; texto claro só aqui.

Evitar texto branco sobre blocos teintados ou empilhar vários fundos saturados no mesmo painel.

## Não usar

- `backdrop-blur` em componentes (excepto `.luna-overlay-scrim`)
- `bg-gradient-to-*` em UI funcional (excepção: capas marketplace em `MarketplaceListingArt`)
- `rounded-full bg-accent` como CTA ad hoc — usar `luna-btn-primary`
- Cores Tailwind cruas (`emerald-400`, `orange-500`) — usar tokens `success`, `warning`, `danger`, `accent`
- `shadow-2xl` em modais — usar `luna-dialog` (`shadow-overlay`)

## Tokens

Definidos em [`src/index.css`](../src/index.css) `@theme`: `canvas`, `surface`, `raised`, `accent`, `success`, `danger`, `warning`, etc.

## Regressão

```bash
node scripts/find-legacy-ui.cjs
```
