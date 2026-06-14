import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useThemeRevision } from '../hooks/useThemeRevision'
import { isMemoryNoteHighlight, useLunaBadgeNav } from '../context/LunaBadgeNavigation'
import {
  memoryKindNoteShellClass,
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

function IconPencil({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className ?? 'size-3.5'}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.862 4.487" />
    </svg>
  )
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className ?? 'size-3.5'}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  )
}

type Props = {
  note: MemoryNote
  sectionKind?: MemoryKindId
  onDeleteNote: (id: string) => void
  onUpdateNote?: (id: string, patch: MemoryNotePatch) => void
}

export function MemoryNoteListItem({
  note: n,
  sectionKind,
  onDeleteNote,
  onUpdateNote,
}: Props) {
  const { t } = useTranslation()
  useThemeRevision()
  const badgeNav = useLunaBadgeNav()
  const [editing, setEditing] = useState(false)
  const highlighted = isMemoryNoteHighlight(badgeNav?.highlight ?? null, n.id)
  const shellKind = sectionKind ?? memoryKindOfNote(n)

  return (
    <li
      id={`memory-note-${n.id}`}
      className={`${memoryKindNoteShellClass(shellKind)} ${
        highlighted ? 'ring-2 ring-accent/40' : ''
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
          <div className="flex items-start justify-between gap-1.5">
            <p className="min-w-0 flex-1 text-[12px] font-medium leading-snug text-fg">
              {n.title}
            </p>
            <div className="flex shrink-0 gap-0.5">
              {onUpdateNote ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="luna-btn-ghost !px-1 !py-0.5"
                  title={t('memories.listItem.edit')}
                  aria-label={t('memories.listItem.edit_aria', { title: n.title })}
                >
                  <IconPencil />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    const ok = await requestConfirm({
                      title: t('memories.listItem.delete_title'),
                      message: t('memories.listItem.delete_message'),
                      confirmLabel: t('memories.listItem.delete_confirm'),
                      destructive: true,
                    })
                    if (ok) onDeleteNote(n.id)
                  })()
                }}
                className="luna-btn-ghost !px-1 !py-0.5 text-danger hover:!bg-danger/10"
                title={t('memories.listItem.delete')}
                aria-label={t('memories.listItem.delete_aria', { title: n.title })}
              >
                <IconTrash />
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
                <span key={tag} className="luna-chip !px-1.5 !py-0 text-[9px] text-fg-dim">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
          <p className="mt-1.5 text-[9px] text-fg-muted">{formatNoteDate(n.createdAt)}</p>
        </>
      )}
    </li>
  )
}
