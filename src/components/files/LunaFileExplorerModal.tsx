import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import {
  fileMatchesAccept,
  formatFileSize,
  lunaGetPlaces,
  lunaListDirectory,
  lunaPathToFile,
  type LunaFileEntry,
  type LunaFilePickerAccept,
  type LunaFilePlace,
} from '../../lib/lunaFileExplorer'
import { sortEntries, splitPathSegments, type FileSortKey } from './fileExplorerUtils'

export type LunaFileExplorerSelectionMode = 'files' | 'folder' | 'paths'

export type LunaFileExplorerModalProps = {
  open: boolean
  title: string
  confirmLabel?: string
  accept?: LunaFilePickerAccept
  multiple?: boolean
  initialPath?: string
  /** `files`: lê binários; `paths`: devolve caminhos; `folder`: pasta actual. */
  selectionMode?: LunaFileExplorerSelectionMode
  onClose: () => void
  onConfirm?: (files: File[]) => void
  onConfirmPaths?: (paths: string[]) => void
}

function PlaceIcon({ kind }: { kind: string }) {
  const cls = 'size-4 shrink-0 opacity-80'
  if (kind === 'home') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    )
  }
  if (kind === 'download') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" x2="12" y1="15" y2="3" />
      </svg>
    )
  }
  if (kind === 'drive') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <path d="M9 10h6" />
      </svg>
    )
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  )
}

function EntryIcon({ type }: { type: LunaFileEntry['type'] }) {
  if (type === 'directory') {
    return (
      <svg className="size-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
      </svg>
    )
  }
  return (
    <svg className="size-4 shrink-0 text-fg-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  )
}

export function LunaFileExplorerModal({
  open,
  title,
  confirmLabel,
  accept,
  multiple = false,
  initialPath,
  selectionMode = 'files',
  onClose,
  onConfirm,
  onConfirmPaths,
}: LunaFileExplorerModalProps) {
  const { t } = useTranslation()
  const confirmBtnLabel = confirmLabel ?? t('files.select')
  const folderMode = selectionMode === 'folder'
  const pathsMode = selectionMode === 'paths'
  const [places, setPlaces] = useState<LunaFilePlace[]>([])
  const [currentPath, setCurrentPath] = useState('')
  const [parentPath, setParentPath] = useState('')
  const [entries, setEntries] = useState<LunaFileEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showHidden, setShowHidden] = useState(false)
  const [sortKey, setSortKey] = useState<FileSortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [navStack, setNavStack] = useState<string[]>([])

  const maxFiles = accept?.maxFiles ?? (multiple ? 20 : 1)

  const loadDir = useCallback(
    async (dir: string, pushHistory = true) => {
      setLoading(true)
      setError(null)
      try {
        const r = await lunaListDirectory(dir, { showHidden })
        if (pushHistory && currentPath && currentPath !== dir) {
          setNavStack((s) => [...s, currentPath])
        }
        setCurrentPath(r.path)
        setParentPath(r.parent)
        setEntries(r.entries)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('files.error_open_folder'))
      } finally {
        setLoading(false)
      }
    },
    [showHidden, currentPath],
  )

  useEffect(() => {
    if (!open) return
    setSelected(new Set())
    setQuery('')
    setNavStack([])
    void (async () => {
      try {
        const { places: p, home } = await lunaGetPlaces()
        setPlaces(p)
        await loadDir(initialPath || home, false)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('files.explorer_unavailable'))
      }
    })()
  }, [open, initialPath])

  useEffect(() => {
    if (!open || !currentPath) return
    void loadDir(currentPath, false)
  }, [showHidden])

  const crumbs = useMemo(() => splitPathSegments(currentPath), [currentPath])

  const visibleEntries = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = entries
    if (q) {
      list = list.filter((e) => e.name.toLowerCase().includes(q))
    }
    return sortEntries(list, sortKey, sortDir)
  }, [entries, query, sortKey, sortDir])

  function goUp() {
    if (parentPath && parentPath !== currentPath) {
      void loadDir(parentPath)
    }
  }

  function goBack() {
    const prev = navStack[navStack.length - 1]
    if (!prev) return
    setNavStack((s) => s.slice(0, -1))
    void loadDir(prev, false)
  }

  function toggleSelect(entry: LunaFileEntry) {
    if (entry.type !== 'file') return
    if (!fileMatchesAccept(entry.name, accept)) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(entry.path)) {
        next.delete(entry.path)
        return next
      }
      if (!multiple) {
        return new Set([entry.path])
      }
      if (next.size >= maxFiles) return next
      next.add(entry.path)
      return next
    })
  }

  function openEntry(entry: LunaFileEntry) {
    if (entry.type === 'directory') {
      void loadDir(entry.path)
      return
    }
    if (fileMatchesAccept(entry.name, accept)) {
      if (multiple) {
        toggleSelect(entry)
      } else {
        setSelected(new Set([entry.path]))
      }
    }
  }

  async function confirmPaths(paths: string[]) {
    if (paths.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const files: File[] = []
      for (const p of paths) {
        files.push(await lunaPathToFile(p, accept?.maxBytesPerFile))
      }
      onConfirm?.(files)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('files.error_read_file'))
    } finally {
      setBusy(false)
    }
  }

  function handleConfirm() {
    if (folderMode) {
      if (!currentPath) return
      onConfirmPaths?.([currentPath])
      onClose()
      return
    }
    if (pathsMode) {
      onConfirmPaths?.([...selected])
      onClose()
      return
    }
    void confirmPaths([...selected])
  }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose()
      if (e.key === 'Backspace' && e.target === document.body) {
        e.preventDefault()
        goBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose, navStack])

  if (!open) return null

  const extHint = accept?.extensions?.length
    ? accept.extensions.map((e) => (e.startsWith('.') ? e : `.${e}`)).join(', ')
    : null

  const layer = (
    <div
      className="luna-overlay-scrim luna-file-explorer-layer flex items-center justify-center p-3 sm:p-8"
      role="presentation"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="luna-dialog flex h-[min(88vh,40rem)] w-full max-w-4xl flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-ui font-semibold text-fg">{title}</h2>
            {extHint ? (
              <p className="text-[11px] text-fg-muted">{t('files.types_hint', { types: extHint })}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="luna-modal-close disabled:opacity-50"
            aria-label={t('files.close_aria')}
          >
            ✕
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-44 shrink-0 flex-col border-r border-line-subtle bg-sidebar sm:w-52">
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
              {t('files.shortcuts')}
            </p>
            <nav className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
              {places.map((place) => (
                <button
                  key={place.id}
                  type="button"
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] transition ${
                    currentPath === place.path
                      ? 'bg-accent-muted text-accent'
                      : 'text-fg-dim hover:bg-raised'
                  }`}
                  onClick={() => void loadDir(place.path)}
                >
                  <PlaceIcon kind={place.icon} />
                  <span className="truncate">{place.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-1 border-b border-line-subtle px-3 py-2">
              <button
                type="button"
                title={t('files.back')}
                disabled={navStack.length === 0}
                onClick={goBack}
                className="rounded-md px-2 py-1 text-[11px] text-fg-dim hover:bg-raised disabled:opacity-30"
              >
                ←
              </button>
              <button
                type="button"
                title={t('files.up_folder')}
                onClick={goUp}
                className="rounded-md px-2 py-1 text-[11px] text-fg-dim hover:bg-raised"
              >
                ↑
              </button>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5 text-[11px]">
                {crumbs.map((c, i) => (
                  <span key={c.path} className="flex min-w-0 items-center gap-0.5">
                    {i > 0 ? <span className="text-fg-muted">/</span> : null}
                    <button
                      type="button"
                      className="max-w-[8rem] truncate rounded px-1 text-accent hover:bg-raised hover:underline sm:max-w-[10rem]"
                      onClick={() => void loadDir(c.path)}
                    >
                      {c.label}
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-line-subtle px-3 py-2">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('files.filter_placeholder')}
                className="min-w-[10rem] flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none"
              />
              <select
                value={`${sortKey}-${sortDir}`}
                onChange={(e) => {
                  const [k, d] = e.target.value.split('-') as [FileSortKey, 'asc' | 'desc']
                  setSortKey(k)
                  setSortDir(d)
                }}
                className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[11px] text-fg"
              >
                <option value="name-asc">{t('files.sort_name_asc')}</option>
                <option value="name-desc">{t('files.sort_name_desc')}</option>
                <option value="date-desc">{t('files.sort_date_desc')}</option>
                <option value="date-asc">{t('files.sort_date_asc')}</option>
                <option value="size-desc">{t('files.sort_size_desc')}</option>
              </select>
              <label className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                <input
                  type="checkbox"
                  checked={showHidden}
                  onChange={(e) => setShowHidden(e.target.checked)}
                />
                {t('files.hidden')}
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <p className="px-4 py-8 text-center text-ui text-fg-muted">{t('files.loading')}</p>
              ) : error ? (
                <p className="px-4 py-8 text-center text-ui text-danger">{error}</p>
              ) : visibleEntries.length === 0 ? (
                <p className="px-4 py-8 text-center text-ui text-fg-muted">
                  {t('files.empty_folder')}
                </p>
              ) : (
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-canvas text-fg-muted">
                    <tr className="border-b border-line-subtle">
                      <th className="px-3 py-2 font-medium">{t('files.column_name')}</th>
                      <th className="hidden w-24 px-2 py-2 font-medium sm:table-cell">
                        {t('files.column_size')}
                      </th>
                      <th className="hidden w-36 px-2 py-2 font-medium md:table-cell">
                        {t('files.column_modified')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEntries.map((entry) => {
                      const isDir = entry.type === 'directory'
                      const selectable =
                        isDir || fileMatchesAccept(entry.name, accept)
                      const sel = selected.has(entry.path)
                      return (
                        <tr
                          key={entry.path}
                          className={`cursor-pointer border-b border-line-subtle/60 transition ${
                            sel ? 'bg-accent-muted/40' : 'hover:bg-raised/60'
                          } ${!selectable && !isDir ? 'opacity-40' : ''}`}
                          onClick={() => openEntry(entry)}
                          onDoubleClick={() => {
                            if (isDir) {
                              if (folderMode) {
                                void loadDir(entry.path)
                              } else {
                                void loadDir(entry.path)
                              }
                              return
                            }
                            if (folderMode) return
                            if (pathsMode && fileMatchesAccept(entry.name, accept)) {
                              onConfirmPaths?.([entry.path])
                              onClose()
                              return
                            }
                            if (fileMatchesAccept(entry.name, accept)) {
                              void confirmPaths([entry.path])
                            }
                          }}
                        >
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <EntryIcon type={entry.type} />
                              <span className="truncate font-medium text-fg">
                                {entry.name}
                              </span>
                            </div>
                          </td>
                          <td className="hidden px-2 py-2 text-fg-muted sm:table-cell">
                            {isDir ? '—' : formatFileSize(entry.size)}
                          </td>
                          <td className="hidden px-2 py-2 text-fg-muted md:table-cell">
                            {entry.modifiedAt
                              ? new Date(entry.modifiedAt).toLocaleString('pt-BR')
                              : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-line px-4 py-3">
          <p className="truncate text-[11px] text-fg-muted">
            {folderMode
              ? currentPath
                ? t('files.footer_folder', {
                    name: currentPath.split(/[/\\]/).pop() || currentPath,
                  })
                : t('files.footer_navigate')
              : selected.size > 0
                ? t('files.footer_selected', { count: selected.size })
                : multiple
                  ? t('files.footer_select_up_to', { max: maxFiles })
                  : pathsMode
                    ? t('files.footer_select_files')
                    : t('files.footer_select_one')}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="luna-btn-secondary px-4 py-2 text-ui"
              disabled={busy}
              onClick={onClose}
            >
              {t('files.cancel')}
            </button>
            <button
              type="button"
              className="luna-btn-primary px-4 py-2 text-ui"
              disabled={
                busy || (folderMode ? !currentPath : selected.size === 0)
              }
              onClick={handleConfirm}
            >
              {busy ? t('files.loading_confirm') : confirmBtnLabel}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )

  return createPortal(layer, document.body)
}
