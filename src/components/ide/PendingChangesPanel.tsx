import { useState } from 'react'
import { useLunaWorkspace } from '../../context/LunaWorkspaceContext'
import { PatchDiffPreview } from './PatchDiffPreview'

function basename(p: string): string {
  return p.replace(/\\/g, '/').split('/').pop() ?? p
}

type Props = {
  /** `chat` — acima do composer no painel de conversa. */
  variant?: 'chat' | 'sidebar'
}

export function PendingChangesPanel({ variant = 'chat' }: Props) {
  const ws = useLunaWorkspace()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [commitBusy, setCommitBusy] = useState(false)

  const hasPatches = ws.pendingPatches.length > 0
  const hasCommit = Boolean(ws.pendingGitCommit)

  if (!hasPatches && !hasCommit) return null

  const isChat = variant === 'chat'

  const handleAccept = async (id: string) => {
    if (busyId) return
    setBusyId(id)
    try {
      await ws.acceptPatch(id)
    } finally {
      setBusyId(null)
    }
  }

  const handleCommit = async (id: string) => {
    if (commitBusy) return
    setCommitBusy(true)
    try {
      await ws.acceptGitCommit(id)
    } finally {
      setCommitBusy(false)
    }
  }

  return (
    <div
      className={
        isChat
          ? 'border-b border-line bg-canvas px-2 py-2'
          : 'shrink-0 border-t border-line bg-sidebar/90 px-2 py-2'
      }
    >
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
        Alterações pendentes
      </p>
      <ul className={`space-y-2 ${isChat ? 'max-h-36' : 'max-h-40'} overflow-y-auto`}>
        {ws.pendingPatches.map((p) => {
          const busy = busyId === p.id
          return (
            <li
              key={p.id}
              className="luna-callout-warning px-2.5 py-2"
            >
              <p className="text-[12px] font-medium text-fg">
                {p.summary || basename(p.path)}
              </p>
              <button
                type="button"
                className="truncate text-left text-[10px] text-accent hover:underline"
                title={p.path}
                onClick={() => void ws.openFile(p.path)}
              >
                {p.path}
              </button>
              <PatchDiffPreview
                oldContent={p.oldContent}
                newContent={p.newContent}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={busy || busyId !== null}
                  onClick={() => void handleAccept(p.id)}
                  className="luna-btn-primary px-2.5 py-1 text-[11px] disabled:opacity-45"
                >
                  {busy ? 'A aplicar…' : 'Aceitar'}
                </button>
                <button
                  type="button"
                  disabled={busy || busyId !== null}
                  onClick={() => ws.rejectPatch(p.id)}
                  className="luna-btn-secondary px-2.5 py-1 text-[11px] disabled:opacity-45"
                >
                  Rejeitar
                </button>
              </div>
            </li>
          )
        })}
        {ws.pendingGitCommit ? (
          <li className="luna-callout-warning px-2.5 py-2">
            <p className="text-[12px] font-medium text-fg">Commit git</p>
            <p className="text-[10px] text-fg-dim">{ws.pendingGitCommit.message}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={commitBusy}
                onClick={() => void handleCommit(ws.pendingGitCommit!.id)}
                className="luna-btn-warning px-2.5 py-1 text-[11px] disabled:opacity-45"
              >
                {commitBusy ? 'A confirmar…' : 'Confirmar commit'}
              </button>
              <button
                type="button"
                disabled={commitBusy}
                onClick={() => ws.rejectGitCommit()}
                className="rounded-md border border-line px-2.5 py-1 text-[11px] text-fg-muted hover:bg-white/[0.06] disabled:opacity-45"
              >
                Cancelar
              </button>
            </div>
          </li>
        ) : null}
      </ul>
    </div>
  )
}
