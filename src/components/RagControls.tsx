import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ragClear,
  ragIndexFiles,
  ragIndexFolder,
  ragPickFiles,
  ragPickFolder,
  ragStatus,
  type RagStatus,
} from '../lib/ragClient'
import { fileBasename } from '../lib/pathUtils'
import { useLunaWorkspaceOptional } from '../context/LunaWorkspaceContext'
import { EmptyState } from '../ui/EmptyState'
import { Switch } from './ui/Switch'

type Props = {
  ragEnabled: boolean
  onRagEnabledChange: (value: boolean) => void
  variant?: 'sidebar' | 'settings'
}

function folderHint(path: string, maxLen = 28): string {
  const base = fileBasename(path)
  const tail = base.length > maxLen ? `${base.slice(0, maxLen)}…` : base
  return tail
}

export function RagControls({ ragEnabled, onRagEnabledChange, variant = 'sidebar' }: Props) {
  const { t } = useTranslation()
  const workspace = useLunaWorkspaceOptional()
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState<RagStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSettings = variant === 'settings'
  const isExpanded = isSettings || expanded

  const refresh = useCallback(async () => {
    const s = await ragStatus()
    setStatus(s)
  }, [])

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev
      if (next) void refresh()
      return next
    })
  }

  async function handlePickAndIndex() {
    setBusy(true)
    setError(null)
    try {
      const pick = await ragPickFolder()
      if (pick.canceled || !pick.path) return
      const res = await ragIndexFolder(pick.path)
      if (!res.ok) {
        setError(res.error || t('rag.error_index_folder'))
        return
      }
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handlePickFilesAndIndex() {
    setBusy(true)
    setError(null)
    try {
      const pick = await ragPickFiles()
      if (pick.canceled || pick.paths.length === 0) return
      const res = await ragIndexFiles(pick.paths)
      if (!res.ok) {
        setError(res.error || t('rag.error_index_files'))
        return
      }
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleIndexWorkspace() {
    const root = workspace?.workspaceRoot
    if (!root) return
    setBusy(true)
    setError(null)
    try {
      const res = await ragIndexFolder(root)
      if (!res.ok) {
        setError(res.error || t('rag.error_index_workspace'))
        return
      }
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleClearIndex() {
    setBusy(true)
    setError(null)
    try {
      const res = await ragClear()
      if (!res.ok) {
        setError(t('rag.error_clear'))
        return
      }
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const statusLine = useMemo(() => {
    if (!status) return t('rag.status_loading')
    if (!status.ok) return t('rag.status_read_error')
    if (status.chunkCount === 0) return t('rag.status_empty')
    const n = status.chunkCount
    const chunks = n === 1 ? t('rag.chunk_one') : t('rag.chunk_other')
    if (status.indexedFolder) {
      return t('rag.status_from_folder', {
        count: n,
        chunks,
        folder: folderHint(status.indexedFolder),
      })
    }
    return t('rag.status_from_files', { count: n, chunks })
  }, [status, t])

  const toggleLabel = ragEnabled ? t('rag.toggle_on') : t('rag.toggle_off')

  return (
    <div className={isSettings ? "flex flex-col gap-6" : "shrink-0 border-b border-line bg-sidebar"}>
      {!isSettings && (
        <button
          type="button"
          onClick={toggleExpanded}
          className="luna-hover-row flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
          aria-expanded={expanded}
        >
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-fg-dim">
            {toggleLabel}
          </span>
          <span
            className={`shrink-0 text-fg-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      )}

      {isExpanded ? (
        <div className={isSettings ? "" : "border-t border-line px-3 pb-3 pt-2"}>
          <div className={isSettings ? "flex flex-col gap-6" : "mx-auto flex max-w-3xl flex-col gap-3"}>
            {isSettings && (
              <Switch
                label={t('rag.use_files', 'Usar Ficheiros RAG')}
                description="Permite que a Luna consulte os ficheiros locais e da tua área de trabalho para melhorar o contexto das respostas."
                checked={ragEnabled}
                onChange={(c) => onRagEnabledChange(c)}
                disabled={busy}
              />
            )}
            {status?.ok && status.chunkCount === 0 ? (
              <EmptyState
                title={t('rag.empty_title')}
                description={t('rag.empty_desc')}
                action={
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      className="luna-btn-primary px-4 py-2 text-xs disabled:opacity-40"
                      onClick={() => void handlePickAndIndex()}
                    >
                      {t('rag.add_folder')}
                    </button>
                    {workspace?.workspaceRoot ? (
                      <button
                        type="button"
                        disabled={busy}
                        className="luna-btn-secondary px-4 py-2 text-xs disabled:opacity-40"
                        onClick={() => void handleIndexWorkspace()}
                      >
                        {t('rag.index_workspace')}
                      </button>
                    ) : null}
                  </div>
                }
              />
            ) : (
              isSettings ? (
                <div className="luna-card flex items-center gap-6 !p-4">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-fg">{status?.chunkCount || 0}</span>
                    <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">{t('rag.chunks_indexed', 'Trechos Indexados')}</span>
                  </div>
                  {status?.ok && status.indexedFolder ? (
                    <div className="flex flex-col border-l border-line pl-6">
                      <span className="text-sm font-medium text-fg truncate max-w-[200px]" title={status.indexedFolder}>
                        {folderHint(status.indexedFolder, 40)}
                      </span>
                      <span className="text-xs font-medium text-fg-muted uppercase tracking-wider mt-0.5">{t('rag.folder_label', 'Origem')}</span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="luna-card flex flex-col gap-2 !p-3">
                  <p className="text-[11px] leading-relaxed text-fg-muted">
                    {t('rag.detail_hint', { statusLine })}
                  </p>
                </div>
              )
            )}

            {!isSettings && (
              <>
                <Switch
                  label={t('rag.use_files', 'Usar Ficheiros RAG')}
                  checked={ragEnabled}
                  onChange={(c) => onRagEnabledChange(c)}
                  disabled={busy}
                  className="text-[12px]"
                />
                <p
                  className="text-[11px] text-fg-muted"
                  dangerouslySetInnerHTML={{ __html: t('rag.offline_hint') }}
                />
              </>
            )}

            <div className={`flex flex-col gap-3 ${isSettings ? 'pt-4' : 'pt-2'}`}>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handlePickAndIndex()}
                  className="luna-btn-secondary px-4 py-2 text-xs disabled:opacity-40"
                >
                  {t('rag.add_folder')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handlePickFilesAndIndex()}
                  className="luna-btn-secondary px-4 py-2 text-xs disabled:opacity-40"
                >
                  {t('rag.add_files')}
                </button>
                {workspace?.workspaceRoot ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleIndexWorkspace()}
                    className="luna-btn-primary px-4 py-2 text-xs disabled:opacity-40"
                  >
                    {t('rag.index_workspace')}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy || (status?.ok && status.chunkCount === 0)}
                  onClick={() => void handleClearIndex()}
                  className="luna-btn-secondary ml-auto px-4 py-2 text-xs text-danger disabled:opacity-40"
                >
                  {t('rag.clear_saved')}
                </button>
              </div>
              {isSettings && (
                <div className="flex items-center gap-2 mt-4 border-t border-line pt-4">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-muted shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <p className="text-[10px] text-fg-muted" dangerouslySetInnerHTML={{ __html: t('rag.offline_hint') }} />
                </div>
              )}
            </div>

            {error ? (
              <p className="luna-callout-danger">{error}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
