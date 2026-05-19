import { useState } from 'react'
import { useThemeRevision } from '../hooks/useThemeRevision'
import { isMemoryNoteHighlight, useLunaBadgeNav } from '../context/LunaBadgeNavigation'
import {
  MEMORY_KIND_META,
  memoryKindBadgeClass,
  memoryKindOfNote,
  type MemoryKindId,
} from '../lib/memoryKinds'
import type { MemoryNotePatch } from '../lib/patchMemoryNote'
import { requestConfirm } from '../lib/confirm'
import type { MemoryNote } from '../types/memory'
import { MemoryNoteEditor } from './MemoryNoteEditor'

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
  useThemeRevision()
  const meta = MEMORY_KIND_META[kind]
  return (
    <span
      className={`luna-kind-badge inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium ${memoryKindBadgeClass(kind)}`}
    >
      {meta.label}
    </span>
  )
}

type Props = {
  note: MemoryNote
  onDeleteNote: (id: string) => void
  onUpdateNote?: (id: string, patch: MemoryNotePatch) => void
}

export function MemoryNoteListItem({
  note: n,
  onDeleteNote,
  onUpdateNote,
}: Props) {
  useThemeRevision()
  const badgeNav = useLunaBadgeNav()
  const [editing, setEditing] = useState(false)
  const highlighted = isMemoryNoteHighlight(badgeNav?.highlight ?? null, n.id)
  const noteKind = memoryKindOfNote(n)

  return (
    <li
      id={`memory-note-${n.id}`}
      className={`rounded-lg border bg-surface px-2 py-2 transition-shadow ${
        highlighted
          ? 'border-violet-400/50 ring-2 ring-violet-400/40'
          : 'border-line-subtle'
      }`}
    >
      {editing && onUpdateNote ? (
        <MemoryNoteEditor
          note={n}
          onCancel={() => setEditing(false)}
          onSave={(patch) => {
            onUpdateNote(n.id, patch)
            setEditing(false)
          }}
        />
      ) : (
        <>
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-1">
                <KindBadge kind={noteKind} />
              </div>
              <p className="text-[12px] font-medium leading-snug text-fg">
                {n.title}
              </p>
            </div>
            <div className="flex shrink-0 gap-0.5">
              {onUpdateNote ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded px-1 text-[10px] text-fg-muted hover:bg-raised-hover hover:text-fg"
                  title="Editar"
                  aria-label={`Editar memória: ${n.title}`}
                >
                  ✎
                </button>
              ) : null}
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
                className="rounded px-1 text-[10px] text-fg-muted hover:bg-raised-hover hover:text-red-400"
                title="Apagar"
                aria-label={`Apagar memória: ${n.title}`}
              >
                ✕
              </button>
            </div>
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
                  className="rounded bg-raised px-1.5 py-0.5 text-[9px] text-fg-dim ring-1 ring-line-subtle"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
          <p className="mt-1.5 text-[9px] text-fg-muted">
            {formatNoteDate(n.createdAt)}
          </p>
        </>
      )}
    </li>
  )
}
