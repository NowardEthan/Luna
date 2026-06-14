import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForgeLayout } from '../../../context/ForgeLayoutContext'
import { useLunaWorkspace } from '../../../context/LunaWorkspaceContext'
import { useForgeDiagnostics } from '../../../lib/forgeDiagnosticsStore'
import { ForgeTerminalPanel } from './ForgeTerminalPanel'
import { ForgeOutputPanel } from './ForgeOutputPanel'
import { ForgeDebugPanel } from './ForgeDebugPanel'
import type { ForgeBottomTab } from '../../../lib/forgeLayout'

const TABS: ForgeBottomTab[] = ['problems', 'output', 'terminal', 'debug']

function basename(p: string): string {
  return p.replace(/\\/g, '/').split('/').pop() || p
}

export function ForgeBottomPanel() {
  const { t } = useTranslation()
  const forge = useForgeLayout()
  const ws = useLunaWorkspace()
  const diagnostics = useForgeDiagnostics()
  const [patchBusyId, setPatchBusyId] = useState<string | null>(null)
  const reviewCount =
    ws.pendingPatches.length + (ws.pendingGitCommit ? 1 : 0)
  const lintCount = diagnostics.length
  const problemCount = lintCount + reviewCount

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <header className="flex shrink-0 items-center justify-between border-b border-line bg-sidebar/90">
        <div className="flex min-w-0 items-center">
          {TABS.map((tab) => {
            const active = forge.bottomTab === tab
            const badge =
              tab === 'problems' && problemCount > 0 ? problemCount : null
            return (
              <button
                key={tab}
                type="button"
                onClick={() => forge.setBottomTab(tab)}
                className={`forge-panel-tab ${active ? 'forge-panel-tab--active' : ''}`}
                aria-pressed={active}
              >
                {t(`forge.bottom.${tab}`)}
                {badge != null ? (
                  <span className="ml-1.5 rounded-full bg-warning/20 px-1.5 text-[9px] font-medium text-warning">
                    {badge}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
        <div className="flex shrink-0 items-center gap-1 pr-1">
          <button
            type="button"
            onClick={() => forge.toggleBottomPanel()}
            className="luna-btn-ghost rounded p-1 text-fg-muted hover:text-fg"
            title={t('forge.bottom.collapse')}
            aria-label={t('forge.bottom.collapse')}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="stroke-current"
              strokeWidth="2"
              aria-hidden
            >
              <path d="m6 15 6-6 6 6" />
            </svg>
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        {forge.bottomTab === 'terminal' ? (
          <ForgeTerminalPanel />
        ) : forge.bottomTab === 'output' ? (
          <ForgeOutputPanel />
        ) : forge.bottomTab === 'debug' ? (
          <ForgeDebugPanel />
        ) : forge.bottomTab === 'problems' ? (
          <div className="overflow-y-auto px-3 py-2 text-[11px] text-fg-muted">
            {problemCount === 0 ? (
              <p>{t('forge.problems.empty')}</p>
            ) : (
              <ul className="space-y-1">
                {diagnostics.map((d, i) => (
                  <li key={`${d.path}:${d.line}:${i}`}>
                    <button
                      type="button"
                      onClick={() => {
                        void ws.openFile(d.path).then(() => {
                          forge.setRevealLine({ path: d.path, line: d.line })
                        })
                      }}
                      className={`luna-btn-ghost w-full text-left ${
                        d.severity === 'error'
                          ? 'text-danger'
                          : d.severity === 'warning'
                            ? 'text-warning'
                            : 'text-fg-muted'
                      }`}
                    >
                      <span className="font-medium">{basename(d.path)}</span>
                      <span className="text-fg-muted/70">
                        {' '}
                        [{d.line}:{d.column}]
                      </span>{' '}
                      {d.message}
                    </button>
                  </li>
                ))}
                {ws.pendingPatches.map((p) => {
                  const busy = patchBusyId === p.id
                  return (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-warning/20 bg-warning/5 px-2 py-1.5"
                    >
                      <button
                        type="button"
                        className="luna-btn-ghost min-w-0 flex-1 truncate text-left text-warning"
                        onClick={() => {
                          void ws.openFile(p.path)
                        }}
                      >
                        <span className="font-medium">{basename(p.path)}</span>
                        <span className="text-fg-muted/80">
                          {' '}
                          — {p.summary || t('forge.problems.patch', { path: p.path })}
                        </span>
                      </button>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          disabled={busy || patchBusyId !== null}
                          onClick={() => {
                            setPatchBusyId(p.id)
                            void ws.acceptPatch(p.id).finally(() => setPatchBusyId(null))
                          }}
                          className="rounded border border-success/30 px-2 py-0.5 text-[10px] font-semibold text-success hover:bg-success/10 disabled:opacity-45"
                        >
                          {busy ? '…' : t('forge.review.accept', 'Aceitar')}
                        </button>
                        <button
                          type="button"
                          disabled={busy || patchBusyId !== null}
                          onClick={() => ws.rejectPatch(p.id)}
                          className="rounded border border-line px-2 py-0.5 text-[10px] text-fg-muted hover:bg-raised disabled:opacity-45"
                        >
                          {t('forge.review.reject', 'Rejeitar')}
                        </button>
                      </div>
                    </li>
                  )
                })}
                {ws.pendingGitCommit ? (
                  <li className="text-accent">
                    {t('forge.problems.commit')}
                  </li>
                ) : null}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
