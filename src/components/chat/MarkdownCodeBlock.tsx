import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers } from '@codemirror/view'
import { copyWithToast } from '../../lib/toast'
import { codemirrorLanguageExtension } from '../../lib/codemirrorLanguages'
import { useMarkdownCodeBlockExtensions } from '../../hooks/useCodeMirrorTheme'
import {
  languageLabel,
  resolveCodeLanguage,
} from '../../lib/markdownCodeLang'

type Props = {
  code: string
  className?: string
  compact?: boolean
}

export function MarkdownCodeBlock({ code, className, compact = false }: Props) {
  const { t } = useTranslation()
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const cmExtensions = useMarkdownCodeBlockExtensions(compact)

  const languageId = useMemo(
    () => resolveCodeLanguage(code, className),
    [code, className],
  )
  const lineCount = useMemo(() => code.split('\n').length, [code])
  const showLineNumbers = lineCount >= 2

  useEffect(() => {
    if (!hostRef.current) return

    const extensions = [
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
      EditorView.lineWrapping,
      ...cmExtensions,
      codemirrorLanguageExtension(languageId),
    ]
    if (showLineNumbers) extensions.push(lineNumbers())

    const view = new EditorView({
      state: EditorState.create({ doc: code, extensions }),
      parent: hostRef.current,
    })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [code, languageId, compact, showLineNumbers, cmExtensions])

  const label = languageLabel(languageId)

  return (
    <div
      className={`group/code relative mb-3 overflow-hidden rounded-xl border border-line-subtle bg-composer-well shadow-soft last:mb-0 ${
        compact ? 'text-[11px]' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-line-subtle bg-surface px-3 py-1.5">
        <span className="text-caption font-medium uppercase tracking-wider text-fg-muted">
          {label}
        </span>
        <button
          type="button"
          className="luna-btn-ghost !rounded-md border border-line-subtle !px-2 !py-0.5 text-caption opacity-80 group-hover/code:opacity-100"
          onClick={() => void copyWithToast(code.trim())}
          aria-label={t('chatTurn.copy_code')}
        >
          {t('chatTurn.copy')}
        </button>
      </div>
      <div
        ref={hostRef}
        className="max-h-[min(320px,50vh)] min-h-[2.5rem] overflow-hidden"
        aria-label={t('chatTurn.code_block_aria', { label })}
      />
    </div>
  )
}
