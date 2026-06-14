import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const [title, setTitle] = useState(note.title)
  const [detail, setDetail] = useState(note.detail)
  const [kind, setKind] = useState<MemoryKindId>(memoryKindOfNote(note))
  const [tagsText, setTagsText] = useState((note.tags ?? []).join(', '))

  const save = () => {
    const tags = tagsText
      .split(/[,;]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
    onSave({ title, detail, kind, tags })
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-0.5 block text-[9px] font-medium uppercase tracking-wide text-fg-muted">
          {t('memories.editor.title')}
        </span>
        <input
          type="text"
          value={title}
          maxLength={MAX_NOTE_TITLE_LEN}
          onChange={(e) => setTitle(e.target.value)}
          className="luna-field text-[12px]"
        />
      </label>
      <label className="block">
        <span className="mb-0.5 block text-[9px] font-medium uppercase tracking-wide text-fg-muted">
          {t('memories.editor.detail')}
        </span>
        <textarea
          value={detail}
          maxLength={MAX_NOTE_DETAIL_LEN}
          rows={3}
          onChange={(e) => setDetail(e.target.value)}
          className="luna-field luna-field-muted resize-y text-[11px]"
        />
      </label>
      <label className="block">
        <span className="mb-0.5 block text-[9px] font-medium uppercase tracking-wide text-fg-muted">
          {t('memories.editor.type')}
        </span>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as MemoryKindId)}
          className="luna-field text-[11px]"
        >
          {MEMORY_KIND_ORDER.map((id) => (
            <option key={id} value={id}>
              {MEMORY_KIND_META[id].label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-0.5 block text-[9px] font-medium uppercase tracking-wide text-fg-muted">
          {t('memories.editor.tags')}
        </span>
        <input
          type="text"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          className="luna-field luna-field-muted text-[11px]"
          placeholder={t('memories.editor.tags_placeholder')}
        />
      </label>
      <div className="flex justify-end gap-1.5 pt-1">
        <button
          type="button"
          className="luna-btn-secondary px-2 py-1 text-[10px]"
          onClick={onCancel}
        >
          {t('memories.editor.cancel')}
        </button>
        <button type="button" className="luna-btn-primary px-2 py-1 text-[10px]" onClick={save}>
          {t('memories.editor.save')}
        </button>
      </div>
    </div>
  )
}
