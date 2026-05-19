import { useState } from 'react'
import {
  MEMORY_KIND_META,
  MEMORY_KIND_ORDER,
  memoryKindOfNote,
  type MemoryKindId,
} from '../lib/memoryKinds'
import {
  MAX_NOTE_DETAIL_LEN,
  MAX_NOTE_TITLE_LEN,
} from '../lib/userMemoryStorage'
import type { MemoryNote } from '../types/memory'
import type { MemoryNotePatch } from '../lib/patchMemoryNote'

type Props = {
  note: MemoryNote
  onSave: (patch: MemoryNotePatch) => void
  onCancel: () => void
}

export function MemoryNoteEditor({ note, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(note.title)
  const [detail, setDetail] = useState(note.detail)
  const [kind, setKind] = useState<MemoryKindId>(memoryKindOfNote(note))
  const [tagsText, setTagsText] = useState((note.tags ?? []).join(', '))

  const save = () => {
    const tags = tagsText
      .split(/[,;]+/)
      .map((t) => t.trim())
      .filter(Boolean)
    onSave({ title, detail, kind, tags })
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-0.5 block text-[9px] uppercase text-fg-muted">
          Título
        </span>
        <input
          type="text"
          value={title}
          maxLength={MAX_NOTE_TITLE_LEN}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-line bg-canvas px-2 py-1 text-[12px] text-fg"
        />
      </label>
      <label className="block">
        <span className="mb-0.5 block text-[9px] uppercase text-fg-muted">
          Detalhe
        </span>
        <textarea
          value={detail}
          maxLength={MAX_NOTE_DETAIL_LEN}
          rows={3}
          onChange={(e) => setDetail(e.target.value)}
          className="w-full resize-y rounded border border-line bg-canvas px-2 py-1 text-[11px] text-fg-dim"
        />
      </label>
      <label className="block">
        <span className="mb-0.5 block text-[9px] uppercase text-fg-muted">
          Tipo
        </span>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as MemoryKindId)}
          className="w-full rounded border border-line bg-canvas px-2 py-1 text-[11px] text-fg"
        >
          {MEMORY_KIND_ORDER.map((id) => (
            <option key={id} value={id}>
              {MEMORY_KIND_META[id].label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-0.5 block text-[9px] uppercase text-fg-muted">
          Etiquetas (separadas por vírgula)
        </span>
        <input
          type="text"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          className="w-full rounded border border-line bg-canvas px-2 py-1 text-[11px] text-fg-dim"
          placeholder="ex.: react, pt-br"
        />
      </label>
      <div className="flex justify-end gap-1.5 pt-1">
        <button
          type="button"
          className="rounded px-2 py-1 text-[10px] text-fg-muted hover:bg-white/[0.06]"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button
          type="button"
          className="luna-btn-primary px-2 py-1 text-[10px]"
          onClick={save}
        >
          Guardar
        </button>
      </div>
    </div>
  )
}
