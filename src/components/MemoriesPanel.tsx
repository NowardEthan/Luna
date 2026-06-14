import { useMemo, useState } from 'react'
import {
  MEMORY_KIND_META,
  MEMORY_KIND_ORDER,
  memoryKindFilterPillClass,
  memoryKindOfNote,
  memoryKindSectionClass,
  memoryKindSectionCountClass,
  memoryKindSectionHeadingClass,
  type MemoryKindId,
} from '../lib/memoryKinds'
import { lunaFilterPillClass } from '../lib/lunaVisual'
import type { MemoryNote, MemoryUiPrefs } from '../types/memory'
import { LunaCoreMemorySection } from './LunaCoreMemorySection'
import { MemoryNoteListItem } from './MemoryNoteListItem'
import type { MemoryNotePatch } from '../lib/patchMemoryNote'
import { EmptyState } from '../ui/EmptyState'
import { useTranslation } from 'react-i18next'

type Props = {
  open: boolean
  embedded?: boolean
  notes: MemoryNote[]
  memoryUi?: MemoryUiPrefs
  onDeleteNote: (id: string) => void
  onUpdateNote?: (id: string, patch: MemoryNotePatch) => void
  onClose?: () => void
}

type FilterId = 'all' | MemoryKindId

export function MemoriesPanel({
  open,
  embedded = false,
  notes,
  memoryUi,
  onDeleteNote,
  onUpdateNote,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<FilterId>('all')
  const grouped = useMemo(() => {
    const map = new Map<MemoryKindId, MemoryNote[]>()
    for (const id of MEMORY_KIND_ORDER) map.set(id, [])
    const sorted = [...notes].sort((a, b) => b.createdAt - a.createdAt)
    for (const n of sorted) {
      const k = memoryKindOfNote(n)
      map.get(k)?.push(n)
    }
    return map
  }, [notes])

  const counts = useMemo(() => {
    const c: Record<MemoryKindId, number> = {
      identity: 0,
      preference: 0,
      project: 0,
      constraint: 0,
      health: 0,
      context: 0,
      other: 0,
    }
    for (const n of notes) {
      c[memoryKindOfNote(n)]++
    }
    return c
  }, [notes])

  const visibleKinds = useMemo(() => {
    return MEMORY_KIND_ORDER.filter((id) => {
      const list = grouped.get(id) ?? []
      if (!list.length) return false
      if (filter === 'all') return true
      return filter === id
    })
  }, [grouped, filter])

  return (
    <>
      {open && !embedded ? (
        <button
          type="button"
          className="luna-overlay-scrim fixed inset-0 z-30 md:hidden"
          aria-label={t('memories.close_aria')}
          onClick={onClose}
        />
      ) : null}
      <aside
        className={
          embedded
            ? `relative flex h-full w-full flex-col overflow-hidden bg-sidebar ${
                open ? 'luna-sidebar-panel-enter' : 'pointer-events-none opacity-0'
              }`
            : `relative flex shrink-0 flex-col overflow-hidden border-r border-line bg-sidebar transition-[width] duration-200 ease-out max-md:fixed max-md:inset-y-0 max-md:left-11 max-md:z-40 max-md:shadow-xl ${
                open ? 'w-[300px]' : 'w-0 border-r-0 pointer-events-none max-md:translate-x-[-100%]'
              }`
        }
        aria-hidden={!open}
        aria-label={t('memories.panel_aria')}
      >
        <div
          className={`flex size-full flex-col transition-opacity duration-150 ${
            embedded
              ? open
                ? 'opacity-100'
                : 'opacity-0'
              : open
                ? 'min-w-[300px] opacity-100'
                : 'min-w-0 opacity-0'
          }`}
        >
          <div className="shrink-0 border-b border-line px-2.5 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-fg">{t('memories.title')}</span>
              {notes.length > 0 ? (
                <span className="luna-chip tabular-nums text-[10px] text-fg-dim">
                  {notes.length}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[10px] leading-snug text-fg-muted">
              {t('memories.description')}
            </p>
            {memoryUi?.panelHint ? (
              <p className="luna-callout-warning mt-2 !text-[10px]">{memoryUi.panelHint}</p>
            ) : null}
          </div>

          <div className="shrink-0 px-2.5 pt-2">
            <LunaCoreMemorySection open={open} />
          </div>

          {notes.length > 0 ? (
            <div className="shrink-0 border-b border-line px-2 py-2">
              <div
                className="flex flex-wrap gap-1"
                role="tablist"
                aria-label={t('memories.filter_aria')}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={filter === 'all'}
                  onClick={() => setFilter('all')}
                  className={lunaFilterPillClass('default', filter === 'all')}
                >
                  {t('memories.all')}
                  <span className="ml-1 opacity-80">{notes.length}</span>
                </button>
                {MEMORY_KIND_ORDER.map((id) => {
                  const n = counts[id]
                  if (!n) return null
                  const meta = MEMORY_KIND_META[id]
                  const active = filter === id
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setFilter(id)}
                      className={memoryKindFilterPillClass(id, active)}
                    >
                      {meta.label}
                      <span className="ml-1 opacity-80">{n}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {!notes.length ? (
              <div className="luna-empty">
                <EmptyState
                  title={t('memories.empty_title')}
                  description={t('memories.empty_desc')}
                />
              </div>
            ) : !visibleKinds.length ? (
              <div className="luna-empty">
                <EmptyState
                  title={t('memories.empty_filter_title')}
                  description={t('memories.empty_filter_desc')}
                  action={
                    <button
                      type="button"
                      className="luna-btn-secondary mt-1 px-3 py-1.5 text-ui"
                      onClick={() => setFilter('all')}
                    >
                      {t('memories.view_all')}
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="space-y-3">
                {visibleKinds.map((kindId) => {
                  const sectionNotes = grouped.get(kindId) ?? []
                  if (!sectionNotes.length) return null
                  const meta = MEMORY_KIND_META[kindId]
                  const emphasized = memoryUi?.emphasizeKind === kindId
                  return (
                    <section
                      key={kindId}
                      className={`p-2.5 ${memoryKindSectionClass(kindId, emphasized)}`}
                    >
                      <header className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3
                            className={`text-[11px] uppercase tracking-wide ${memoryKindSectionHeadingClass(kindId)}`}
                          >
                            {meta.label}
                          </h3>
                          <p className="mt-0.5 text-[9px] leading-snug text-fg-muted">
                            {meta.description}
                          </p>
                        </div>
                        <span className={memoryKindSectionCountClass(kindId)}>
                          {sectionNotes.length}
                        </span>
                      </header>
                      <ul className="space-y-1.5">
                        {sectionNotes.map((n) => (
                          <MemoryNoteListItem
                            key={n.id}
                            note={n}
                            sectionKind={kindId}
                            onDeleteNote={onDeleteNote}
                            onUpdateNote={onUpdateNote}
                          />
                        ))}
                      </ul>
                    </section>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
