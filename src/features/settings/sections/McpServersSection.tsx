import { useCallback, useEffect, useState } from 'react'
import { mcpToolProvider } from '../../../core/mcp/McpToolProvider'
import { pingMcpServer } from '../../../core/mcp/mcpPing'
import {
  readMcpServers,
  writeMcpServers,
  type McpServerConfig,
} from '../../../core/mcp/storage'
import { requestConfirm } from '../../../lib/confirm'
import { EmptyState } from '../../../ui/EmptyState'
type PingState = 'idle' | 'checking' | 'ok' | 'error'

function newServer(): McpServerConfig {
  return {
    id: `mcp-${Date.now()}`,
    name: '',
    url: 'http://127.0.0.1:8080',
    enabled: false,
  }
}

export function McpServersSection() {
  const [servers, setServers] = useState(readMcpServers)
  const [pingMap, setPingMap] = useState<Record<string, PingState>>({})
  const [draft, setDraft] = useState<McpServerConfig | null>(null)

  const persist = useCallback((next: McpServerConfig[]) => {
    setServers(next)
    writeMcpServers(next)
    void mcpToolProvider.reconnect()
  }, [])

  const checkServer = useCallback(async (server: McpServerConfig) => {
    setPingMap((m) => ({ ...m, [server.id]: 'checking' }))
    const result = await pingMcpServer(server)
    setPingMap((m) => ({
      ...m,
      [server.id]: result.status === 'ok' ? 'ok' : 'error',
    }))
  }, [])

  useEffect(() => {
    for (const s of servers) {
      if (s.enabled) void checkServer(s)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- ping inicial

  const updateServer = (id: string, patch: Partial<McpServerConfig>) => {
    const next = servers.map((s) => (s.id === id ? { ...s, ...patch } : s))
    persist(next)
  }

  const removeServer = async (server: McpServerConfig) => {
    const ok = await requestConfirm({
      title: 'Remover servidor MCP',
      message: `Remover «${server.name || server.id}»?`,
      confirmLabel: 'Remover',
      destructive: true,
    })
    if (!ok) return
    persist(servers.filter((s) => s.id !== server.id))
  }

  const saveDraft = () => {
    if (!draft) return
    const name = draft.name.trim() || 'Servidor MCP'
    const url = draft.url.trim()
    if (!url) return
    persist([
      ...servers,
      { ...draft, name, url, enabled: draft.enabled },
    ])
    setDraft(null)
  }

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-title font-semibold text-fg">Servidores MCP</h2>
        <p className="mt-1 text-ui text-fg-muted">
          Endpoints HTTP para ferramentas externas. O agente invoca ferramentas via POST quando o servidor está activo.
        </p>
      </header>

      {servers.length === 0 && !draft ? (
        <EmptyState
          title="Nenhum servidor MCP"
          description="Ligue ferramentas externas (bases de dados, APIs, etc.) via Model Context Protocol. Cada servidor expõe ferramentas que o agente pode usar."
          action={
            <button
              type="button"
              className="luna-btn-primary mt-1 px-3 py-1.5 text-ui"
              onClick={() => setDraft(newServer())}
            >
              Adicionar servidor MCP
            </button>
          }
        />
      ) : null}

      <ul className="flex flex-col gap-3">
        {servers.map((s) => {
          const ping = pingMap[s.id] ?? 'idle'
          return (
            <li
              key={s.id}
              className="rounded-lg border border-line bg-surface/40 p-3"
            >
              <div className="flex flex-wrap items-start gap-2">
                <label className="min-w-[8rem] flex-1">
                  <span className="mb-1 block text-[10px] uppercase text-fg-muted">
                    Nome
                  </span>
                  <input
                    type="text"
                    value={s.name}
                    onChange={(e) =>
                      updateServer(s.id, { name: e.target.value })
                    }
                    onBlur={() => void checkServer(s)}
                    className="w-full rounded border border-line bg-raised px-2 py-1 text-ui text-fg"
                  />
                </label>
                <label className="min-w-[12rem] flex-[2]">
                  <span className="mb-1 block text-[10px] uppercase text-fg-muted">
                    URL
                  </span>
                  <input
                    type="url"
                    value={s.url}
                    onChange={(e) =>
                      updateServer(s.id, { url: e.target.value })
                    }
                    onBlur={() => void checkServer(s)}
                    className="w-full rounded border border-line bg-raised px-2 py-1 text-ui text-fg"
                  />
                </label>
                <div className="flex items-end gap-2 pt-5">
                  <label className="flex items-center gap-1.5 text-ui text-fg-dim">
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={(e) => {
                        updateServer(s.id, { enabled: e.target.checked })
                        if (e.target.checked) void checkServer(s)
                      }}
                    />
                    Activo
                  </label>
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-[10px] text-fg-muted hover:bg-white/[0.05]"
                    onClick={() => void checkServer(s)}
                  >
                    Testar
                  </button>
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-[10px] text-red-300/90 hover:bg-red-500/10"
                    onClick={() => void removeServer(s)}
                  >
                    Remover
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-fg-muted">
                Estado:{' '}
                {ping === 'checking'
                  ? 'A testar…'
                  : ping === 'ok'
                    ? 'Alcançável'
                    : ping === 'error'
                      ? 'Sem ligação'
                      : '—'}
              </p>
            </li>
          )
        })}
      </ul>

      {draft ? (
        <div className="rounded-lg border border-dashed border-line p-3">
          <p className="mb-2 text-ui font-medium text-fg">Novo servidor</p>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Nome"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="min-w-[8rem] flex-1 rounded border border-line bg-raised px-2 py-1 text-ui"
            />
            <input
              type="url"
              placeholder="http://127.0.0.1:8080"
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              className="min-w-[12rem] flex-[2] rounded border border-line bg-raised px-2 py-1 text-ui"
            />
            <button
              type="button"
              className="luna-btn-primary px-3 py-1 text-ui"
              onClick={saveDraft}
            >
              Guardar
            </button>
            <button
              type="button"
              className="luna-btn-secondary px-3 py-1 text-ui"
              onClick={() => setDraft(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="w-full rounded-lg border border-dashed border-line py-2 text-ui text-fg-muted hover:border-accent/40"
          onClick={() => setDraft(newServer())}
        >
          + Adicionar servidor MCP
        </button>
      )}
    </div>
  )
}
