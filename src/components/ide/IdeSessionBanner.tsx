import { useState } from 'react'
import { useLunaWorkspace } from '../../context/LunaWorkspaceContext'
import {
  readIdeAutoApply,
  writeIdeAutoApply,
} from '../../lib/ideContextConfig'
import { useIdeAgentProgress } from '../../lib/ideAgentProgress'

/** Faixa do modo IDE + toggle aplicar patches automaticamente. */
export function IdeSessionBanner() {
  const ws = useLunaWorkspace()
  const agentProgress = useIdeAgentProgress()
  const [autoApply, setAutoApply] = useState(readIdeAutoApply)
  const folder = ws.workspaceRoot
    ? ws.workspaceRoot.replace(/\\/g, '/').split('/').pop()
    : null

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-accent/20 bg-accent/5 px-3 py-1.5">
      <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-caption font-semibold uppercase tracking-wide text-accent">
        Sessão IDE
      </span>
      {agentProgress && agentProgress.round > 0 ? (
        <span
          className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-caption text-fg-muted"
          title={agentProgress.phase}
        >
          Passo {agentProgress.round}
        </span>
      ) : null}
      <p className="min-w-0 flex-1 truncate text-ui text-fg-dim">
        {folder
          ? `«${folder}» — contexto de código injectado (activo, terminal, git).`
          : 'Abre uma pasta — a Luna injecta código e ambiente em cada mensagem.'}
      </p>
      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-caption text-fg-muted">
        <input
          type="checkbox"
          checked={autoApply}
          onChange={(e) => {
            setAutoApply(e.target.checked)
            writeIdeAutoApply(e.target.checked)
          }}
          className="size-3 rounded border-line accent-accent"
        />
        Aplicar patches auto
      </label>
    </div>
  )
}
