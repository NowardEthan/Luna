import { useMemo, useState } from 'react'
import {
  MEMORY_KIND_META,
  MEMORY_KIND_ORDER,
  memoryKindOfNote,
  type MemoryKindId,
} from '../lib/memoryKinds'
import type { MemoryNote, MemoryUiPrefs } from '../types/memory'
import { MemoryNoteListItem } from './MemoryNoteListItem'
import type { MemoryNotePatch } from '../lib/patchMemoryNote'
import { EmptyState } from '../ui/EmptyState'

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
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          aria-label="Fechar memórias"
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
      aria-label="Memórias da Luna"
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
        <div className="shrink-0 border-b border-line px-2.5 py-2">
          <span className="text-[12px] font-medium text-fg-dim">Memórias</span>
          <p className="mt-1 text-[10px] leading-snug text-fg-muted">
            Factos que a Luna guardou — organizados por tipo e usados como
            contexto nos próximos chats.
          </p>
          {memoryUi?.panelHint ? (
            <p className="mt-2 rounded-md border border-violet-400/30 bg-violet-500/10 px-2 py-1.5 text-[10px] leading-snug text-fg-dim dark:text-violet-100/90">
              {memoryUi.panelHint}
            </p>
          ) : null}
        </div>

        {notes.length > 0 ? (
          <div className="shrink-0 border-b border-line px-2 py-1.5">
            <div
              className="flex flex-wrap gap-1"
              role="tablist"
              aria-label="Filtrar por tipo"
            >
              <button
                type="button"
                role="tab"
                aria-selected={filter === 'all'}
                onClick={() => setFilter('all')}
                className={`rounded-md px-2 py-0.5 text-[10px] transition-colors ${
                  filter === 'all'
                    ? 'bg-raised text-fg ring-1 ring-line'
                    : 'text-fg-muted hover:bg-raised-hover hover:text-fg-dim'
                }`}
              >
                Todas
                <span className="ml-1 tabular-nums text-fg-muted">{notes.length}</span>
              </button>
              {MEMORY_KIND_ORDER.map((id) => {
                const n = counts[id]
                if (!n) return null
                const meta = MEMORY_KIND_META[id]
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={filter === id}
                    onClick={() => setFilter(id)}
                    className={`rounded-md px-2 py-0.5 text-[10px] transition-colors ${
                      filter === id
                        ? 'bg-raised text-fg ring-1 ring-line'
                        : 'text-fg-muted hover:bg-raised-hover hover:text-fg-dim'
                    }`}
                  >
                    {meta.label}
                    <span className="ml-1 tabular-nums text-fg-muted">{n}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {!notes.length ? (
            <EmptyState
              title="Sem memórias ainda"
              description="À medida que conversas, a Luna pode guardar preferências e factos úteis com tipo e etiquetas."
            />
          ) : !visibleKinds.length ? (
            <EmptyState
              title="Nenhuma nota neste filtro"
              description="Escolha «Todas» ou outro tipo para ver as memórias guardadas."
              action={
                <button
                  type="button"
                  className="luna-btn-secondary mt-1 px-3 py-1.5 text-ui"
                  onClick={() => setFilter('all')}
                >
                  Ver todas
                </button>
              }
            />
          ) : (
            <div className="space-y-4">
              {visibleKinds.map((kindId) => {
                const sectionNotes = grouped.get(kindId) ?? []
                if (!sectionNotes.length) return null
                const meta = MEMORY_KIND_META[kindId]
                const emphasized = memoryUi?.emphasizeKind === kindId
                return (
                  <section
                    key={kindId}
                    className={`rounded-lg border px-1.5 pb-1.5 pt-1 ${meta.sectionClass} ${
                      emphasized ? 'ring-1 ring-violet-400/35' : ''
                    }`}
                  >
                    <header className="mb-1 flex items-center justify-between gap-2 px-1 pt-0.5">
                      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-fg-dim">
                        {meta.label}
                      </h3>
                      <span className="text-[9px] tabular-nums text-fg-muted">
                        {sectionNotes.length}
                      </span>
                    </header>
                    <ul className="space-y-1.5">
                      {sectionNotes.map((n) => (
                        <MemoryNoteListItem
                          key={n.id}
                          note={n}
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
