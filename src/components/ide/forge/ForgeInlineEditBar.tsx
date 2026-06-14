import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLunaWorkspace } from '../../../context/LunaWorkspaceContext'
import { ensureIdeLlmSelection } from '../../../lib/ideLlmSelection'
import {
  closeForgeInlineEdit,
  setForgeInlineEditBusy,
  setForgeInlineEditPrompt,
  useForgeInlineEdit,
} from '../../../lib/forgeInlineEditStore'
import { runForgeInlineEdit } from '../../../features/ide/runForgeInlineEdit'
import { showToast } from '../../../lib/toast'

export function ForgeInlineEditBar() {
  const { t } = useTranslation()
  const ws = useLunaWorkspace()
  const { open, draft, prompt, busy } = useForgeInlineEdit()
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => inputRef.current?.focus())
      return () => cancelAnimationFrame(id)
    }
    abortRef.current?.abort()
    abortRef.current = null
    return undefined
  }, [open])

  if (!open || !draft) return null

  const handleSubmit = async () => {
    const instruction = prompt.trim()
    if (!instruction || busy) return

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setForgeInlineEditBusy(true)

    try {
      const llmSelection = await ensureIdeLlmSelection()
      const result = await runForgeInlineEdit({
        path: draft.path,
        fileContent: draft.content,
        selectedText: draft.selectedText,
        instruction,
        llmSelection,
        signal: ac.signal,
      })

      if (ac.signal.aborted) return

      if (!result.ok) {
        showToast(result.error, 'error', 6000)
        return
      }

      if (result.newContent === draft.content) {
        showToast(t('forge.inlineEdit.noChange', 'Nenhuma alteração sugerida.'), 'info', 4000)
        closeForgeInlineEdit()
        return
      }

      ws.proposePatch({
        path: draft.path,
        summary: instruction.slice(0, 120),
        oldContent: draft.content,
        newContent: result.newContent,
      })
      showToast(t('forge.inlineEdit.proposed', 'Alteração proposta — revê no editor.'), 'success', 4000)
      closeForgeInlineEdit()
    } finally {
      if (abortRef.current === ac) {
        abortRef.current = null
        setForgeInlineEditBusy(false)
      }
    }
  }

  const selectionHint = draft.selectedText.trim()
    ? t('forge.inlineEdit.selection', {
        chars: draft.selectedText.length,
        defaultValue: '{{chars}} caracteres seleccionados',
      })
    : t('forge.inlineEdit.wholeFile', 'Ficheiro completo')

  return (
    <div
      className="shrink-0 border-b border-accent/30 bg-accent/10 px-3 py-2"
      role="dialog"
      aria-label={t('forge.inlineEdit.title', 'Editar com IA')}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-accent">
          {t('forge.inlineEdit.title', 'Editar com IA')}
        </span>
        <span className="truncate text-[10px] text-fg-muted">{selectionHint}</span>
        <button
          type="button"
          onClick={() => closeForgeInlineEdit()}
          className="luna-btn-ghost shrink-0 rounded p-1 text-fg-muted hover:text-fg"
          aria-label={t('common.close', 'Fechar')}
        >
          ×
        </button>
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          disabled={busy}
          placeholder={t(
            'forge.inlineEdit.placeholder',
            'Descreve a alteração (Enter para gerar)…',
          )}
          onChange={(e) => setForgeInlineEditPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              closeForgeInlineEdit()
            }
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSubmit()
            }
          }}
          className="min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 py-1.5 text-[12px] text-fg placeholder:text-fg-muted focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-60"
        />
        <button
          type="button"
          disabled={busy || !prompt.trim()}
          onClick={() => void handleSubmit()}
          className="luna-btn-primary shrink-0 px-3 py-1.5 text-[11px] disabled:opacity-50"
        >
          {busy
            ? t('forge.inlineEdit.generating', 'A gerar…')
            : t('forge.inlineEdit.generate', 'Gerar')}
        </button>
      </div>
    </div>
  )
}
