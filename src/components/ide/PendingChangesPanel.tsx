import { useLunaWorkspace } from '../../context/LunaWorkspaceContext'

function basename(p: string): string {
  return p.replace(/\\/g, '/').split('/').pop() ?? p
}

export function PendingChangesPanel() {
  const ws = useLunaWorkspace()
  const hasPatches = ws.pendingPatches.length > 0
  const hasCommit = Boolean(ws.pendingGitCommit)

  if (!hasPatches && !hasCommit) return null

  return (
    <div className="shrink-0 border-t border-line bg-sidebar/90 px-2 py-2">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
        Alterações pendentes
      </p>
      <ul className="max-h-40 space-y-2 overflow-y-auto">
        {ws.pendingPatches.map((p) => (
          <li
            key={p.id}
            className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-2 py-1.5"
          >
            <p className="text-[11px] font-medium text-fg">
              {p.summary || basename(p.path)}
            </p>
            <p className="truncate text-[10px] text-fg-muted">{p.path}</p>
            <div className="mt-1.5 flex gap-1">
              <button
                type="button"
                onClick={() => void ws.acceptPatch(p.id)}
                className="rounded bg-accent/20 px-2 py-0.5 text-[10px] text-accent hover:bg-accent/30"
              >
                Aceitar
              </button>
              <button
                type="button"
                onClick={() => ws.rejectPatch(p.id)}
                className="rounded px-2 py-0.5 text-[10px] text-fg-muted hover:bg-white/[0.06]"
              >
                Rejeitar
              </button>
            </div>
          </li>
        ))}
        {ws.pendingGitCommit ? (
          <li className="rounded-lg border border-orange-500/25 bg-orange-500/5 px-2 py-1.5">
            <p className="text-[11px] font-medium text-fg">Commit git</p>
            <p className="text-[10px] text-fg-dim">{ws.pendingGitCommit.message}</p>
            <div className="mt-1.5 flex gap-1">
              <button
                type="button"
                onClick={() => void ws.acceptGitCommit(ws.pendingGitCommit!.id)}
                className="rounded bg-orange-500/20 px-2 py-0.5 text-[10px] text-orange-200 hover:bg-orange-500/30"
              >
                Confirmar commit
              </button>
              <button
                type="button"
                onClick={() => ws.rejectGitCommit()}
                className="rounded px-2 py-0.5 text-[10px] text-fg-muted hover:bg-white/[0.06]"
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
