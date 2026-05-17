import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { bracketMatching, indentOnInput } from '@codemirror/language'
import { useLunaWorkspace } from '../../context/LunaWorkspaceContext'
import { codemirrorLanguageExtension } from '../../lib/codemirrorLanguages'
import { lunaCodeMirrorTheme } from '../../lib/codemirrorTheme'

function basename(p: string): string {
  const parts = p.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || p
}

export function EditorPanel() {
  const ws = useLunaWorkspace()
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const active = ws.openFiles.find((f) => f.path === ws.activeFilePath)

  useEffect(() => {
    if (!hostRef.current || !active) return
    if (viewRef.current) {
      viewRef.current.destroy()
      viewRef.current = null
    }
    const path = active.path
    const view = new EditorView({
      state: EditorState.create({
        doc: active.content,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          indentOnInput(),
          bracketMatching(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          ...lunaCodeMirrorTheme,
          codemirrorLanguageExtension(active.languageId),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) {
              ws.updateTabContent(path, view.state.doc.toString())
            }
          }),
        ],
      }),
      parent: hostRef.current,
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [active?.path, active?.languageId])

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-canvas">
      <div className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-line bg-sidebar/80 px-1 py-0.5">
        {ws.openFiles.map((f) => {
          const isActive = f.path === ws.activeFilePath
          return (
            <button
              key={f.path}
              type="button"
              onClick={() => ws.setActiveFile(f.path)}
              className={`group flex max-w-[180px] shrink-0 items-center gap-1 rounded px-2 py-1 text-[11px] ${
                isActive
                  ? 'bg-canvas text-fg'
                  : 'text-fg-muted hover:bg-white/[0.05] hover:text-fg-dim'
              }`}
            >
              <span className="truncate">
                {basename(f.path)}
                {f.dirty ? ' •' : ''}
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  ws.closeTab(f.path)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation()
                    ws.closeTab(f.path)
                  }
                }}
                className="rounded px-0.5 text-[10px] opacity-60 hover:opacity-100"
                aria-label="Fechar"
              >
                ×
              </span>
            </button>
          )
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {active ? (
          <div ref={hostRef} className="h-full w-full overflow-auto text-[13px]" />
        ) : (
          <p className="flex h-full items-center justify-center text-[12px] text-fg-muted">
            Abre um ficheiro no explorador
          </p>
        )}
      </div>
    </div>
  )
}
