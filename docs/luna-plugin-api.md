# API de plugins Luna

Versão da API: **1** (`LUNA_API_VERSION` em `packages/luna-sdk`).

## Manifesto (`plugin.json`)

```json
{
  "id": "meu-plugin",
  "name": "Meu Plugin",
  "version": "1.0.0",
  "entry": "index.ts",
  "lunaApiVersion": "1",
  "trusted": false,
  "permissions": ["commands", "panels", "tools", "hooks", "storage"]
}
```

| Campo | Descrição |
|-------|-----------|
| `trusted` | `true` — executa no thread principal (dev). `false` — preparado para worker (stub). |
| `lunaApiVersion` | Deve ser `"1"` para esta versão da Luna. |

## Permissões

| Permissão | Capacidade |
|-----------|------------|
| `tools` | `api.registerTool` (nome prefixado `id__nome`) |
| `panels` | `api.registerPanel` |
| `commands` | `api.registerCommand` |
| `hooks` | `api.on(event, handler)` |
| `storage` | `api.storage.get/set` |
| `settings` | `api.registerSettings`, propriedades em `plugin.json` → `settings.fields` |

## Ciclo de vida

1. **Incluído na app:** pasta `.luna/plugins/<id>/` (empacotado com o projecto).
2. **Marketplace:** ícone da **loja** no menu lateral (barra de actividade) — instala add-ons do catálogo (`src/data/marketplace-catalog.json`) com um clique (Electron).
3. **Instalado pelo utilizador:** **Definições → Add-ons → Instalar do disco** (Electron), pasta com `plugin.json` copiada para `userData/luna/plugins/<id>/`.
4. Abra **Definições → Add-ons** (ícone na barra lateral) e confirme o aviso de segurança.
5. Active o add-on — `activate(api)` é chamado com `LunaPluginApi`.
6. Ao desactivar, comandos/painéis/ferramentas e listeners `hooks` são removidos.
7. Add-ons de utilizador podem ser **removidos** na lista; os incluídos na app não.

### Marketplace (catálogo v1)

- Listagens em `src/data/marketplace-catalog.json` (`install.type`: `bundled` | `disk` | `url`).
- `bundled` copia de `.luna/plugins/<pluginId>/` via IPC `plugins:installBundled`.
- Para publicar um add-on no catálogo, adicione uma entrada ao JSON e inclua o pacote em `.luna/plugins/`.

### Instalar do disco (desktop)

- Seleccione uma pasta que contenha `plugin.json` válido (`id`, `name`).
- Em desenvolvimento, a pasta é também copiada para `.luna/plugins/<id>/` e a app **recarrega** para o Vite indexar o módulo.
- Em produção, o código é lido de `userData`; use **`index.js`** (JavaScript) como entrada, ou compile TypeScript antes de instalar.

## Propriedades e painel de configuração

No `plugin.json`, defina campos editáveis (funcionam mesmo com o add-on desactivado):

```json
"settings": {
  "fields": [
    { "key": "greeting", "type": "string", "label": "Saudação", "default": "Olá" },
    { "key": "enabled", "type": "boolean", "label": "Activo", "default": true }
  ]
}
```

Tipos: `string`, `boolean`, `number`, `select` (com `options`).

Em `activate`, pode registar um painel React personalizado:

```typescript
api.registerSettings({
  title: 'O meu add-on',
  render: () => createElement(MeuPainel, { api }),
})

api.registerShortcut({
  id: 'toggle',
  label: 'Alternar modo',
  keys: 'Ctrl+Shift+M',
  run: () => { /* ... */ },
})

api.readSetting('greeting', 'fallback')
api.writeSetting('greeting', 'Novo texto')
```

Atalhos só funcionam com o add-on **activo**. Add-ons instalados do disco podem ser **desinstalados** em Definições → Add-ons (painel à direita).

## Módulo de entrada (`index.ts`)

```typescript
import type { LunaPluginApi } from '../../../packages/luna-sdk/src/index'

export async function activate(api: LunaPluginApi): Promise<void> {
  api.registerCommand({
    id: 'meu-plugin:ola',
    label: 'Dizer olá',
    run: () => console.info('Olá!'),
  })
}

export async function deactivate(): Promise<void> {
  /* limpeza opcional */
}
```

## Eventos (`hooks`)

- `agent:turn:start` / `agent:turn:complete`
- `agent:tool:start` / `agent:tool:complete`
- `conversation:created` / `conversation:selected`
- `workspace:patch:proposed` / `accepted` / `rejected`

## Tutorial: primeiro plugin

1. Crie a pasta `.luna/plugins/meu-plugin/` com `plugin.json` e o ficheiro de entrada (`index.ts` ou `index.js`).
2. Edite `plugin.json` (`id`, `name`, `permissions`).
3. Implemente `activate` em `index.ts`.
4. Reinicie a app ou recarregue — o add-on aparece em **Definições → Add-ons**.
5. Active após marcar o checkbox de risco.

## Segurança

Plugins no Electron partilham o contexto da UI. Não active código de origem desconhecida. Plugins não `trusted` estão preparados para sandbox via worker (implementação inicial em `core/plugin/pluginWorker.ts`).
