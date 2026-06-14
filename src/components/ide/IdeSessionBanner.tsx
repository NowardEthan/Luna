import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLunaWorkspace } from '../../context/LunaWorkspaceContext'
import {
  readIdeAutoApply,
  writeIdeAutoApply,
} from '../../lib/ideContextConfig'
import {
  readWorkspaceRagSyncEnabled,
  writeWorkspaceRagSyncEnabled,
} from '../../lib/workspaceRagSync'
import { useIdeAgentProgress } from '../../lib/ideAgentProgress'
import { workspaceDisplayName } from '../../lib/workspaceSessions'
import { LUNA_FORGE_SHORT } from '../../lib/lunaForgeBrand'

/** Faixa do modo IDE + toggle aplicar patches automaticamente. */
export function IdeSessionBanner() {
  const { t } = useTranslation()
  const ws = useLunaWorkspace()
  const agentProgress = useIdeAgentProgress()
  const [autoApply, setAutoApply] = useState(readIdeAutoApply)
  const [ragSync, setRagSync] = useState(readWorkspaceRagSyncEnabled)
  const folder = ws.workspaceRoot
    ? workspaceDisplayName(ws.workspaceRoot)
    : null

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-accent bg-accent-muted px-3 py-1.5">
      <span className="luna-chip px-1.5 py-0.5 text-caption font-semibold uppercase tracking-wide text-accent">
        {LUNA_FORGE_SHORT}
      </span>
      {agentProgress && agentProgress.round > 0 ? (
        <span
          className="luna-chip px-1.5 py-0.5 text-caption text-fg-muted"
          title={agentProgress.phase}
        >
          {t('ide.banner.step', { round: agentProgress.round })}
        </span>
      ) : null}
      <p className="min-w-0 flex-1 truncate text-ui text-fg-dim">
        {folder
          ? t('ide.banner.folderActive', { folder })
          : t('ide.banner.noFolder')}
      </p>
      <label className="luna-btn-ghost flex shrink-0 cursor-pointer items-center gap-1.5 px-1.5 py-0.5 text-caption">
        <input
          type="checkbox"
          checked={autoApply}
          onChange={(e) => {
            setAutoApply(e.target.checked)
            writeIdeAutoApply(e.target.checked)
          }}
          className="size-3 rounded border-line accent-accent"
        />
        {t('ide.banner.autoApply')}
      </label>
      <label className="luna-btn-ghost flex shrink-0 cursor-pointer items-center gap-1.5 px-1.5 py-0.5 text-caption">
        <input
          type="checkbox"
          checked={ragSync}
          onChange={(e) => {
            setRagSync(e.target.checked)
            writeWorkspaceRagSyncEnabled(e.target.checked)
          }}
          className="size-3 rounded border-line accent-accent"
        />
        {t('ide.banner.ragSync')}
      </label>
      <button
        type="button"
        onClick={() => ws.closeWorkspace()}
        className="luna-btn-ghost shrink-0 px-2 py-0.5 text-caption text-fg-muted hover:text-fg"
        title={t('lunaForge.closeProject')}
      >
        {t('lunaForge.closeProject')}
      </button>
    </div>
  )
}
