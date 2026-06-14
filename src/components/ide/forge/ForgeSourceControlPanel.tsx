import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLunaWorkspace } from '../../../context/LunaWorkspaceContext'
import {
  bridgeAgentGitCommit,
  bridgeAgentGitDiff,
  bridgeAgentGitStatus,
  bridgeAgentRunCommand,
} from '../../../lib/lunaBridge'
import {
  gitStatusLabel,
  parseGitPorcelain,
  type GitFileStatus,
} from '../../../lib/forgeGitParse'

function basename(p: string): string {
  return p.replace(/\\/g, '/').split('/').pop() ?? p
}

function FileRow({
  file,
  onOpen,
}: {
  file: GitFileStatus
  onOpen: (path: string) => void
}) {
  const label = gitStatusLabel(file)
  const color =
    file.untracked ? 'text-fg-muted' : file.staged ? 'text-success' : 'text-warning'

  return (
    <button
      type="button"
      onClick={() => onOpen(file.path)}
      className="luna-hover-row flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[11px]"
    >
      <span className={`w-3 shrink-0 font-mono text-[10px] ${color}`}>{label}</span>
      <span className="min-w-0 truncate text-fg">{basename(file.path)}</span>
    </button>
  )
}

export function ForgeSourceControlPanel() {
  const { t } = useTranslation()
  const ws = useLunaWorkspace()
  const [branch, setBranch] = useState<string | null>(null)
  const [files, setFiles] = useState<GitFileStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [commitMsg, setCommitMsg] = useState('')
  const [committing, setCommitting] = useState(false)
  const [diffPreview, setDiffPreview] = useState<string | null>(null)
  const [diffPath, setDiffPath] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!ws.workspaceRoot) return
    setLoading(true)
    setError(null)
    const r = await bridgeAgentGitStatus(ws.workspaceRoot)
    setLoading(false)
    if (!r.ok || !r.output) {
      setError(r.error ?? t('forge.git.failed'))
      setFiles([])
      return
    }
    const parsed = parseGitPorcelain(r.output)
    setBranch(parsed.branch)
    setFiles(parsed.files)
  }, [ws.workspaceRoot, t])

  useEffect(() => {
    void refresh()
  }, [refresh, ws.gitDirtyPaths.size, ws.pendingPatches.length])

  const stageAll = async () => {
    if (!ws.workspaceRoot) return
    await bridgeAgentRunCommand('git add -A', ws.workspaceRoot)
    void refresh()
  }

  const showDiff = async (path: string) => {
    setDiffPath(path)
    const r = await bridgeAgentGitDiff(ws.workspaceRoot ?? undefined, false)
    if (r.ok && r.diff) {
      const chunks = r.diff.split(/^diff --git/m).filter(Boolean)
      const hit = chunks.find((c) => c.includes(path.replace(/\\/g, '/')))
      setDiffPreview(hit ? `diff --git${hit}`.slice(0, 8000) : r.diff.slice(0, 4000))
    } else {
      setDiffPreview(r.error ?? t('forge.git.noDiff'))
    }
  }

  const commit = async () => {
    const msg = commitMsg.trim()
    if (!msg || !ws.workspaceRoot) return
    setCommitting(true)
    await stageAll()
    const r = await bridgeAgentGitCommit(ws.workspaceRoot, msg)
    setCommitting(false)
    if (r.ok) {
      setCommitMsg('')
      setDiffPreview(null)
      void refresh()
    } else {
      setError(r.error ?? t('forge.git.commitFailed'))
    }
  }

  const staged = files.filter((f) => f.staged)
  const unstaged = files.filter((f) => f.unstaged && !f.untracked)
  const untracked = files.filter((f) => f.untracked)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line-subtle px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-fg">
            {branch ? t('forge.git.branch', { branch }) : t('forge.git.noRepo')}
          </p>
          {ws.workspaceFolders.length > 1 && ws.workspaceRoot ? (
            <p className="truncate text-[9px] text-fg-muted" title={ws.workspaceRoot}>
              {t('forge.workspace.gitPrimaryOnly')}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="luna-btn-ghost shrink-0 px-2 py-0.5 text-[10px]"
        >
          {loading ? '…' : t('forge.git.refresh')}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {error ? (
          <p className="px-2 py-2 text-[11px] text-danger">{error}</p>
        ) : files.length === 0 ? (
          <p className="px-2 py-4 text-[11px] text-fg-muted">{t('forge.git.clean')}</p>
        ) : (
          <>
            {staged.length > 0 ? (
              <section className="mb-3">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase text-fg-muted">
                  {t('forge.git.staged')}
                </p>
                {staged.map((f) => (
                  <FileRow key={`s-${f.path}`} file={f} onOpen={(p) => void showDiff(p)} />
                ))}
              </section>
            ) : null}
            {unstaged.length > 0 ? (
              <section className="mb-3">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase text-fg-muted">
                  {t('forge.git.changes')}
                </p>
                {unstaged.map((f) => (
                  <FileRow key={`u-${f.path}`} file={f} onOpen={(p) => void ws.openFile(p)} />
                ))}
              </section>
            ) : null}
            {untracked.length > 0 ? (
              <section>
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase text-fg-muted">
                  {t('forge.git.untracked')}
                </p>
                {untracked.map((f) => (
                  <FileRow key={`t-${f.path}`} file={f} onOpen={(p) => void ws.openFile(p)} />
                ))}
              </section>
            ) : null}
          </>
        )}

        {diffPreview ? (
          <pre className="mt-3 max-h-40 overflow-auto rounded-md border border-line-subtle bg-canvas p-2 text-[9px] text-fg-dim">
            {diffPath ? `${basename(diffPath)}\n` : ''}
            {diffPreview}
          </pre>
        ) : null}
      </div>

      <div className="shrink-0 space-y-2 border-t border-line-subtle p-3">
        <textarea
          value={commitMsg}
          onChange={(e) => setCommitMsg(e.target.value)}
          placeholder={t('forge.git.commitPlaceholder')}
          rows={2}
          className="luna-field w-full resize-none py-1.5 text-[11px]"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void stageAll()}
            className="luna-btn-ghost flex-1 py-1 text-[10px]"
          >
            {t('forge.git.stageAll')}
          </button>
          <button
            type="button"
            onClick={() => void commit()}
            disabled={!commitMsg.trim() || committing}
            className="luna-btn-primary flex-1 py-1 text-[10px] disabled:opacity-50"
          >
            {committing ? '…' : t('forge.git.commit')}
          </button>
        </div>
      </div>
    </div>
  )
}
