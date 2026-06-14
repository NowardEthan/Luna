import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForgeLayout } from '../../../context/ForgeLayoutContext'
import { useForgeCursor } from '../../../lib/forgeCursorStore'
import { useForgeDiagnosticCount } from '../../../lib/forgeDiagnosticsStore'
import { useLunaWorkspace } from '../../../context/LunaWorkspaceContext'
import {
  readIdeAutoApply,
  writeIdeAutoApply,
} from '../../../lib/ideContextConfig'
import {
  readWorkspaceRagSyncEnabled,
  writeWorkspaceRagSyncEnabled,
} from '../../../lib/workspaceRagSync'
import { useIdeAgentProgress } from '../../../lib/ideAgentProgress'
import { workspaceDisplayName } from '../../../lib/workspaceSessions'

function IconClose() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

/** Barra de estado do editor — estilo Cursor / VS Code. */
export function ForgeStatusBar() {
  const { t } = useTranslation()
  const forge = useForgeLayout()
  const cursor = useForgeCursor()
  const ws = useLunaWorkspace()
  const agentProgress = useIdeAgentProgress()
  const [autoApply, setAutoApply] = useState(readIdeAutoApply)
  const [ragSync, setRagSync] = useState(readWorkspaceRagSyncEnabled)

  const dirtyCount = ws.gitDirtyPaths.size
  const lintCount = useForgeDiagnosticCount()
  const reviewCount = ws.pendingPatches.length + (ws.pendingGitCommit ? 1 : 0)
  const problemCount = lintCount + reviewCount

  const projectName = ws.workspaceRoot
    ? ws.workspaceFolders.length > 1
      ? `${workspaceDisplayName(ws.workspaceRoot)} +${ws.workspaceFolders.length - 1}`
      : workspaceDisplayName(ws.workspaceRoot)
    : null

  return (
    <footer className="forge-status-bar flex shrink-0 items-center justify-between border-t border-line bg-sidebar px-2 py-0.5 text-[10px] text-fg-muted">

      {/* ── Esquerda: problemas + git + workspace + agente ── */}
      <div className="flex min-w-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => forge.setBottomTab('problems')}
          className="luna-btn-ghost flex items-center gap-1 rounded px-1.5 py-0.5 hover:text-fg"
          title={t('forge.status.problems')}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span className={problemCount > 0 ? 'text-warning' : ''}>
            {problemCount}
          </span>
          <span className="hidden sm:inline">{t('forge.status.errors')}</span>
        </button>

        <div className="mx-0.5 h-3 w-px bg-line-subtle" aria-hidden />

        {dirtyCount > 0 ? (
          <button
            type="button"
            onClick={() => { forge.setActiveView('git'); forge.setSidebarOpen(true) }}
            className="luna-btn-ghost flex items-center gap-1 rounded px-1.5 py-0.5 text-warning hover:text-fg"
            title="Ver alterações no Git"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="M6 9v1a2 2 0 0 0 2 2h4a2 2 0 0 1 2 2v1" />
            </svg>
            {t('forge.status.changes', { count: dirtyCount })}
          </button>
        ) : (
          <span className="flex items-center gap-1 px-1.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="M6 9v1a2 2 0 0 0 2 2h4a2 2 0 0 1 2 2v1" />
            </svg>
            {t('forge.status.branch')}
          </span>
        )}

        {projectName ? (
          <>
            <div className="mx-0.5 h-3 w-px bg-line-subtle" aria-hidden />
            <span
              className="max-w-[160px] truncate px-1.5 text-fg-dim"
              title={ws.workspaceFolders.length > 1 ? ws.workspaceFolders.join('\n') : ws.workspaceRoot ?? ''}
            >
              {projectName}
            </span>
          </>
        ) : null}

        {agentProgress && agentProgress.round > 0 ? (
          <>
            <div className="mx-0.5 h-3 w-px bg-line-subtle" aria-hidden />
            <span className="animate-pulse px-1.5 text-accent">
              {t('ide.banner.step', { round: agentProgress.round })}
            </span>
          </>
        ) : null}
      </div>

      {/* ── Direita: toggles + posição + encoding + fechar ── */}
      <div className="flex shrink-0 items-center gap-0.5">
        <label className="luna-btn-ghost flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 hover:text-fg" title="Auto-aplicar sugestões do agente">
          <input
            type="checkbox"
            checked={autoApply}
            onChange={(e) => { setAutoApply(e.target.checked); writeIdeAutoApply(e.target.checked) }}
            className="size-2.5 accent-accent"
          />
          <span>{t('ide.banner.autoApply')}</span>
        </label>

        <label className="luna-btn-ghost hidden cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 hover:text-fg sm:flex" title="Sincronizar contexto RAG">
          <input
            type="checkbox"
            checked={ragSync}
            onChange={(e) => { setRagSync(e.target.checked); writeWorkspaceRagSyncEnabled(e.target.checked) }}
            className="size-2.5 accent-accent"
          />
          <span>{t('ide.banner.ragSync')}</span>
        </label>

        <div className="mx-0.5 h-3 w-px bg-line-subtle" aria-hidden />

        <button
          type="button"
          onClick={() => forge.toggleAiPanel()}
          className={`luna-btn-ghost flex items-center gap-1 rounded px-1.5 py-0.5 hover:text-fg ${
            forge.aiPanelOpen ? 'text-accent' : ''
          }`}
          title={t('forge.activity.ai')}
          aria-pressed={forge.aiPanelOpen}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M12 3a7 7 0 0 0-7 7v4l-3 3h8a7 7 0 1 0 7-7Z" />
          </svg>
          <span className="hidden sm:inline">{t('forge.ai.title')}</span>
        </button>

        <div className="mx-0.5 h-3 w-px bg-line-subtle" aria-hidden />

        <span className="px-1.5 tabular-nums text-fg-dim">
          {t('forge.status.position', { line: cursor.line, column: cursor.column })}
        </span>

        <span className="px-1 text-fg-muted">UTF-8</span>

        <div className="mx-0.5 h-3 w-px bg-line-subtle" aria-hidden />

        <button
          type="button"
          onClick={() => ws.closeWorkspace()}
          className="luna-btn-ghost flex items-center gap-1 rounded px-1.5 py-0.5 hover:text-danger"
          title={t('lunaForge.closeProject')}
          aria-label={t('lunaForge.closeProject')}
        >
          <IconClose />
          <span className="hidden sm:inline">{t('lunaForge.closeProject')}</span>
        </button>
      </div>
    </footer>
  )
}
