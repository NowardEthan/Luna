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
import { Switch } from '../../../components/ui/Switch'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const updateServer = (id: string, patch: Partial<McpServerConfig>) => {
    const next = servers.map((s) => (s.id === id ? { ...s, ...patch } : s))
    persist(next)
  }

  const removeServer = async (server: McpServerConfig) => {
    const ok = await requestConfirm({
      title: t('settings.mcp_remove_title'),
      message: t('settings.mcp_remove_message', {
        name: server.name || server.id,
      }),
      confirmLabel: t('common.remove'),
      destructive: true,
    })
    if (!ok) return
    persist(servers.filter((s) => s.id !== server.id))
  }

  const saveDraft = () => {
    if (!draft) return
    const name = draft.name.trim() || t('settings.mcp_default_name')
    const url = draft.url.trim()
    if (!url) return
    persist([...servers, { ...draft, name, url, enabled: draft.enabled }])
    setDraft(null)
  }

  const pingLabel = (ping: PingState) => {
    if (ping === 'checking') return t('settings.mcp_ping_checking')
    if (ping === 'ok') return t('settings.mcp_ping_ok')
    if (ping === 'error') return t('settings.mcp_ping_error')
    return '—'
  }

  return (
    <div className="space-y-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-fg">{t('settings.section_mcp_label', 'Servidores MCP')}</h2>
          <p className="mt-1 text-xs text-fg-muted">
            {t('settings.mcp_hint', 'Endpoints HTTP para ferramentas externas. O agente invoca ferramentas via POST quando o servidor está activo.')}
          </p>
        </div>
        {!draft && (
          <button
            type="button"
            className="luna-btn-primary px-4 py-2 text-xs disabled:opacity-40"
            onClick={() => setDraft(newServer())}
          >
            + {t('settings.mcp_add')}
          </button>
        )}
      </header>

      {servers.length === 0 && !draft ? (
        <EmptyState
          title={t('settings.mcp_empty_title')}
          description={t('settings.mcp_empty_desc')}
        />
      ) : null}

      <ul className="flex flex-col gap-3">
        {servers.map((s) => {
          const ping = pingMap[s.id] ?? 'idle'
          return (
            <li
              key={s.id}
              className="luna-fade-in luna-card"
              style={{ animationDelay: '0.05s' }}
            >
              <div className="flex flex-wrap items-start gap-2">
                <label className="min-w-[8rem] flex-1">
                  <span className="mb-1 block text-[10px] uppercase text-fg-muted">
                    {t('settings.mcp_name')}
                  </span>
                  <input
                    type="text"
                    value={s.name}
                    onChange={(e) => updateServer(s.id, { name: e.target.value })}
                    onBlur={() => void checkServer(s)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ui text-fg shadow-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                  />
                </label>
                <label className="min-w-[12rem] flex-[2]">
                  <span className="mb-1 block text-[10px] uppercase text-fg-muted">
                    URL
                  </span>
                  <input
                    type="url"
                    value={s.url}
                    onChange={(e) => updateServer(s.id, { url: e.target.value })}
                    onBlur={() => void checkServer(s)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ui text-fg shadow-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                  />
                </label>
                <div className="flex items-end gap-3 pt-5">
                  <div className="mr-2">
                    <Switch
                      label={t('settings.mcp_active', 'Ativo')}
                      checked={s.enabled}
                      onChange={(c) => {
                        updateServer(s.id, { enabled: c })
                        if (c) void checkServer(s)
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="luna-btn-secondary px-4 py-2 text-xs"
                    onClick={() => void checkServer(s)}
                  >
                    {t('settings.mcp_test')}
                  </button>
                  <button
                    type="button"
                    className="luna-btn-secondary px-4 py-2 text-xs text-danger hover:bg-danger-muted"
                    onClick={() => void removeServer(s)}
                  >
                    {t('common.remove')}
                  </button>
                </div>
              </div>
              <p className="mt-4 flex items-center gap-2 text-xs text-fg-muted border-t border-line pt-3">
                <span className="font-medium text-fg">{t('settings.mcp_status')}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                  ping === 'ok' ? 'bg-accent/10 text-accent' :
                  ping === 'error' ? 'bg-red-400/10 text-red-400' :
                  ping === 'checking' ? 'bg-fg-muted/10 text-fg-muted' :
                  'bg-surface border border-line'
                }`}>
                  {pingLabel(ping)}
                </span>
              </p>
            </li>
          )
        })}
      </ul>

      {draft ? (
        <div className="luna-fade-in luna-card border-dashed">
          <p className="mb-2 text-ui font-medium text-fg">{t('settings.mcp_new_server')}</p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex-1 min-w-[8rem]">
              <span className="mb-1 block text-[10px] uppercase text-fg-muted">{t('settings.mcp_name')}</span>
              <input
                type="text"
                placeholder={t('settings.mcp_name')}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ui text-fg shadow-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
              />
            </label>
            <label className="flex-[2] min-w-[12rem]">
              <span className="mb-1 block text-[10px] uppercase text-fg-muted">URL</span>
              <input
                type="url"
                placeholder="http://127.0.0.1:8080"
                value={draft.url}
                onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-ui text-fg shadow-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
              />
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                className="luna-btn-primary px-4 py-2 text-xs"
                onClick={saveDraft}
              >
                {t('common.save')}
              </button>
              <button
                type="button"
                className="luna-btn-secondary px-4 py-2 text-xs"
                onClick={() => setDraft(null)}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
