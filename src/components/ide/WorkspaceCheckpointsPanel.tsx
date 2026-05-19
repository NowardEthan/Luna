import { useCallback, useState } from 'react'
import { useLunaWorkspace } from '../../context/LunaWorkspaceContext'
import {
  WORKSPACE_CHECKPOINT_CONV_ID,
  deleteCheckpoint,
  listCheckpoints,
  type LunaCheckpoint,
} from '../../lib/lunaCheckpoint'
import { requestConfirm } from '../../lib/confirm'
import { EmptyState } from '../../ui/EmptyState'

function basename(p: string): string {
  return p.replace(/\\/g, '/').split('/').pop() ?? p
}

function formatWhen(ts: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(ts)
}

export function WorkspaceCheckpointsPanel() {
  const ws = useLunaWorkspace()
  const [expanded, setExpanded] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  const checkpoints = listCheckpoints(WORKSPACE_CHECKPOINT_CONV_ID)

  const refresh = useCallback(() => setRevision((n) => n + 1), [])

  const handleRestore = async (cp: LunaCheckpoint) => {
    const ok = await requestConfirm({
      title: 'Restaurar checkpoint',
      message: `Repor ${cp.files.length} ficheiro(s) ao estado anterior a «${cp.label}»? Alterações não guardadas no editor podem ser perdidas.`,
      confirmLabel: 'Restaurar',
      destructive: true,
    })
    if (!ok) return
    setBusyId(cp.id)
    try {
      const done = await ws.restoreWorkspaceCheckpoint(cp)
      if (done) refresh()
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (cp: LunaCheckpoint) => {
    const ok = await requestConfirm({
      title: 'Apagar checkpoint',
      message: `Remover o ponto de restauro «${cp.label}»?`,
      confirmLabel: 'Apagar',
      destructive: true,
    })
    if (!ok) return
    deleteCheckpoint(WORKSPACE_CHECKPOINT_CONV_ID, cp.id)
    refresh()
  }

  if (!ws.workspaceRoot) return null

  return (
    <div className="shrink-0 border-t border-line bg-sidebar/80 px-2 py-1.5">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
          Pontos de restauro
          {checkpoints.length ? (
            <span className="ml-1 tabular-nums text-fg-dim">
              ({checkpoints.length})
            </span>
          ) : null}
        </span>
        <span
          className={`text-fg-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {expanded ? (
        <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto">
          {checkpoints.length === 0 ? (
            <EmptyState
              title="Sem checkpoints"
              description="Criados automaticamente antes de aplicar patches do agente."
            />
          ) : (
            checkpoints.map((cp) => {
              const busy = busyId === cp.id
              const fileLabel =
                cp.files.length === 1
                  ? basename(cp.files[0].path)
                  : `${cp.files.length} ficheiros`
              return (
                <div
                  key={`${cp.id}-${revision}`}
                  className="rounded-lg border border-line-subtle bg-surface/40 px-2 py-1.5"
                >
                  <p className="truncate text-[11px] font-medium text-fg">
                    {cp.label || fileLabel}
                  </p>
                  <p className="text-[9px] text-fg-muted">
                    {formatWhen(cp.createdAt)} · {fileLabel}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <button
                      type="button"
                      disabled={busy || busyId !== null}
                      className="rounded-md border border-line px-2 py-0.5 text-[10px] text-fg-dim hover:bg-white/[0.05] disabled:opacity-40"
                      onClick={() => void handleRestore(cp)}
                    >
                      {busy ? 'A restaurar…' : 'Restaurar'}
                    </button>
                    <button
                      type="button"
                      disabled={busy || busyId !== null}
                      className="rounded-md px-2 py-0.5 text-[10px] text-fg-muted hover:text-red-300 disabled:opacity-40"
                      onClick={() => void handleDelete(cp)}
                    >
                      Apagar
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
}
