import { useMemo, useState } from 'react'
import { isMemoryNoteHighlight, useLunaBadgeNav } from '../context/LunaBadgeNavigation'
import {
  MEMORY_KIND_META,
  MEMORY_KIND_ORDER,
  memoryKindOfNote,
  type MemoryKindId,
} from '../lib/memoryKinds'
import type { MemoryNote, MemoryUiPrefs } from '../types/memory'
import { requestConfirm } from '../lib/confirm'

function formatNoteDate(ts: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(ts)
}

function KindBadge({ kind }: { kind: MemoryKindId }) {
  const meta = MEMORY_KIND_META[kind]
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium ring-1 ring-inset ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  )
}

type Props = {
  open: boolean
  notes: MemoryNote[]
  memoryUi?: MemoryUiPrefs
  onDeleteNote: (id: string) => void
  onClose?: () => void
}

type FilterId = 'all' | MemoryKindId

export function MemoriesPanel({ open, notes, memoryUi, onDeleteNote, onClose }: Props) {
  const badgeNav = useLunaBadgeNav()
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
      className={`relative flex shrink-0 flex-col overflow-hidden border-r border-line bg-sidebar transition-[width] duration-200 ease-out max-md:fixed max-md:inset-y-0 max-md:left-11 max-md:z-40 max-md:shadow-xl ${
        open ? 'w-[300px]' : 'w-0 border-r-0 pointer-events-none max-md:translate-x-[-100%]'
      }`}
      aria-hidden={!open}
      aria-label="Memórias da Luna"
    >
      <div
        className={`flex size-full flex-col transition-opacity duration-150 ${
          open ? 'min-w-[300px] opacity-100' : 'min-w-0 opacity-0'
        }`}
      >
        <div className="shrink-0 border-b border-line px-2.5 py-2">
          <span className="text-[12px] font-medium text-fg-dim">Memórias</span>
          <p className="mt-1 text-[10px] leading-snug text-fg-muted">
            Factos que a Luna guardou — organizados por tipo e usados como
            contexto nos próximos chats.
          </p>
          {memoryUi?.panelHint ? (
            <p className="mt-2 rounded-md border border-violet-400/25 bg-violet-500/10 px-2 py-1.5 text-[10px] leading-snug text-violet-100/90">
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
                    ? 'bg-white/10 text-fg'
                    : 'text-fg-muted hover:bg-white/[0.05] hover:text-fg-dim'
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
                        ? 'bg-white/10 text-fg'
                        : 'text-fg-muted hover:bg-white/[0.05] hover:text-fg-dim'
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
            <p className="mt-6 px-2 text-center text-[11px] leading-relaxed text-fg-muted">
              Ainda não há notas — à medida que conversares, a Luna pode guardar
              preferências e factos úteis, com tipo e etiquetas.
            </p>
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
                      {sectionNotes.map((n) => {
                        const highlighted = isMemoryNoteHighlight(
                          badgeNav?.highlight ?? null,
                          n.id,
                        )
                        const noteKind = memoryKindOfNote(n)
                        return (
                          <li
                            key={n.id}
                            id={`memory-note-${n.id}`}
                            className={`rounded-lg border bg-surface/60 px-2 py-2 transition-shadow ${
                              highlighted
                                ? 'border-violet-400/50 ring-2 ring-violet-400/40'
                                : 'border-line-subtle'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex flex-wrap items-center gap-1">
                                  <KindBadge kind={noteKind} />
                                </div>
                                <p className="text-[12px] font-medium leading-snug text-fg">
                                  {n.title}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  void (async () => {
                                    const ok = await requestConfirm({
                                      title: 'Apagar memória',
                                      message: 'Apagar esta memória permanentemente?',
                                      confirmLabel: 'Apagar',
                                      destructive: true,
                                    })
                                    if (ok) onDeleteNote(n.id)
                                  })()
                                }}
                                className="shrink-0 rounded px-1 text-[10px] text-fg-muted hover:bg-white/[0.06] hover:text-red-400"
                                title="Apagar"
                                aria-label={`Apagar memória: ${n.title}`}
                              >
                                ✕
                              </button>
                            </div>
                            {n.detail.trim().length > 0 ? (
                              <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-fg-dim">
                                {n.detail}
                              </p>
                            ) : null}
                            {n.tags?.length ? (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {n.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[9px] text-fg-muted"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            <p className="mt-1.5 text-[9px] text-fg-muted">
                              {formatNoteDate(n.createdAt)}
                            </p>
                          </li>
                        )
                      })}
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
