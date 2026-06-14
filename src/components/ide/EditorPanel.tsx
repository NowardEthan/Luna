import { memo, useCallback, useEffect, useMemo, useRef } from 'react'

import { useTranslation } from 'react-i18next'

import { EditorSelection, EditorState, Prec } from '@codemirror/state'

import {

  EditorView,

  highlightActiveLine,

  highlightActiveLineGutter,

  keymap,

  lineNumbers,

} from '@codemirror/view'

import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands'

import { autocompletion } from '@codemirror/autocomplete'

import {

  bracketMatching,

  foldGutter,

  indentOnInput,

} from '@codemirror/language'

import { forEachDiagnostic, lintGutter } from '@codemirror/lint'

import { showMinimap } from '@replit/codemirror-minimap'

import type { ForgeEditorPane } from '../../context/ForgeLayoutContext'

import { useLunaWorkspace } from '../../context/LunaWorkspaceContext'

import { useForgeLayout } from '../../context/ForgeLayoutContext'

import { codemirrorLanguageExtension } from '../../lib/codemirrorLanguages'

import {

  setFileDiagnostics,

  type ForgeDiagnostic,

} from '../../lib/forgeDiagnosticsStore'

import { debounce } from '../../lib/debounce'

import { buildForgeLinter } from '../../lib/forgeEditorLinter'

import { setForgeCursor } from '../../lib/forgeCursorStore'

import {

  useCodeMirrorThemeRevision,

  useLunaCodeMirrorExtensions,

} from '../../hooks/useCodeMirrorTheme'

import {

  buildForgeLspExtensions,

  runForgeLspDefinition,

} from '../../lib/forgeLspExtension'

import {

  forgeLspChangeDocument,

  forgeLspCloseDocument,

  forgeLspOpenDocument,

  isForgeLspLanguage,

} from '../../lib/forgeLspClient'

import { buildForgeInlineDiffExtension } from '../../lib/forgeInlineDiff'
import { openForgeInlineEdit } from '../../lib/forgeInlineEditStore'



type Props = {

  pane?: ForgeEditorPane

}



function syncDiagnosticsToStore(view: EditorView, filePath: string): void {

  const items: ForgeDiagnostic[] = []

  forEachDiagnostic(view.state, (d, from) => {

    const line = view.state.doc.lineAt(from)

    const severity =

      d.severity === 'error'

        ? 'error'

        : d.severity === 'warning'

          ? 'warning'

          : 'info'

    items.push({

      path: filePath,

      line: line.number,

      column: from - line.from + 1,

      message: d.message,

      severity,

    })

  })

  setFileDiagnostics(filePath, items)

}



function EditorPanelInner({ pane = 'primary' }: Props) {

  const { t } = useTranslation()

  const ws = useLunaWorkspace()

  const forge = useForgeLayout()

  const hostRef = useRef<HTMLDivElement>(null)

  const viewRef = useRef<EditorView | null>(null)

  const mountedKeyRef = useRef<string | null>(null)

  const suppressExternalSyncRef = useRef(false)

  const activePathRef = useRef<string | null>(null)



  const wsRef = useRef(ws)

  wsRef.current = ws

  const forgeRef = useRef(forge)

  forgeRef.current = forge

  const setRevealLineRef = useRef(forge.setRevealLine)

  setRevealLineRef.current = forge.setRevealLine



  const panePath =

    pane === 'secondary'

      ? forge.splitFilePath ?? ws.activeFilePath

      : ws.activeFilePath



  const active = panePath

    ? ws.openFiles.find((f) => f.path === panePath)

    : undefined



  const activePatch = useMemo(() => {

    if (!panePath) return null

    return (

      ws.pendingPatches.find(

        (p) => p.path === panePath || p.path.replace(/\\/g, '/') === panePath.replace(/\\/g, '/'),

      ) ?? null

    )

  }, [ws.pendingPatches, panePath])



  const externalRevision = ws.externalContentRevision



  const debouncedSyncDiagnostics = useMemo(

    () =>

      debounce((view: EditorView, filePath: string) => {

        syncDiagnosticsToStore(view, filePath)

      }, 200),

    [],

  )



  const debouncedLspChange = useMemo(

    () =>

      debounce((path: string, text: string) => {

        void forgeLspChangeDocument(path, text)

      }, 350),

    [],

  )



  const cmTheme = useLunaCodeMirrorExtensions()

  const themeRevision = useCodeMirrorThemeRevision()



  const mountKey = active

    ? `${pane}\0${active.path}\0${active.languageId}\0${themeRevision}\0${forge.editorMinimap ? 1 : 0}\0${activePatch?.id ?? ''}`

    : null



  const acceptPatchRef = useRef(ws.acceptPatch)

  acceptPatchRef.current = ws.acceptPatch

  const rejectPatchRef = useRef(ws.rejectPatch)

  rejectPatchRef.current = ws.rejectPatch



  useEffect(() => {

    const path = panePath

    const tab = path

      ? wsRef.current.openFiles.find((f) => f.path === path)

      : undefined



    if (!hostRef.current || !mountKey || !path || !tab) {

      if (viewRef.current && activePathRef.current) {

        void forgeLspCloseDocument(activePathRef.current)

      }

      if (viewRef.current) {

        viewRef.current.destroy()

        viewRef.current = null

      }

      mountedKeyRef.current = null

      activePathRef.current = null

      return

    }



    if (viewRef.current && mountedKeyRef.current === mountKey) {

      return

    }



    if (viewRef.current && activePathRef.current && activePathRef.current !== path) {

      void forgeLspCloseDocument(activePathRef.current)

    }



    if (viewRef.current) {

      viewRef.current.destroy()

      viewRef.current = null

    }



    mountedKeyRef.current = mountKey

    activePathRef.current = path



    const patch = wsRef.current.pendingPatches.find((p) => p.path === path) ?? null

    const minimapCreate = (_view: EditorView) => {

      const dom = document.createElement('div')

      dom.className = 'forge-minimap-host'

      return { dom }

    }



    const extensions = [

      lineNumbers(),

      highlightActiveLineGutter(),

      highlightActiveLine(),

      history(),

      indentOnInput(),

      bracketMatching(),

      foldGutter(),

      lintGutter(),

      buildForgeLinter(tab.languageId),

      ...(window.forgeLsp && isForgeLspLanguage(tab.languageId)

        ? buildForgeLspExtensions(path, tab.languageId)

        : [autocompletion()]),

      Prec.high(keymap.of([indentWithTab])),

      keymap.of([

        ...defaultKeymap,

        ...historyKeymap,

        {

          key: 'Mod-k',

          run: (view) => {

            const sel = view.state.selection.main

            openForgeInlineEdit({

              path,

              content: view.state.doc.toString(),

              selectedText: view.state.sliceDoc(sel.from, sel.to),

              selectionFrom: sel.from,

              selectionTo: sel.to,

              pane,

            })

            return true

          },

        },

        {

          key: 'F12',

          run: (view) => {

            const pos = view.state.selection.main.head

            const line = view.state.doc.lineAt(pos)

            void runForgeLspDefinition(

              path,

              tab.languageId,

              line.number,

              pos - line.from + 1,

            ).then((target) => {

              if (!target) return

              void wsRef.current.openFile(target)

            })

            return true

          },

        },

      ]),

      ...cmTheme,

      codemirrorLanguageExtension(tab.languageId),

      ...(forgeRef.current.editorMinimap

        ? [

            showMinimap.compute(['doc'], () => ({

              create: minimapCreate,

              displayText: 'blocks' as const,

              showOverlay: 'always' as const,

            })),

          ]

        : []),

      ...buildForgeInlineDiffExtension(

        patch,

        (id) => void acceptPatchRef.current(id),

        (id) => rejectPatchRef.current(id),

      ),

      EditorView.domEventHandlers({

        focus: () => {

          if (pane === 'secondary') {

            forgeRef.current.setFocusPane('secondary')

          } else {

            forgeRef.current.setFocusPane('primary')

          }

        },

        wheel: (e) => {

          e.stopPropagation()

          return false

        },

        mousedown: (e) => {

          e.stopPropagation()

          return false

        },

      }),

      EditorView.updateListener.of((u) => {

        if (u.docChanged) {

          const text = u.view.state.doc.toString()

          suppressExternalSyncRef.current = true

          wsRef.current.updateTabContent(path, text)

          if (isForgeLspLanguage(tab.languageId)) {

            debouncedLspChange(path, text)

          }

        }

        if (u.selectionSet && forgeRef.current.focusPane === pane) {

          const pos = u.view.state.selection.main.head

          const line = u.view.state.doc.lineAt(pos)

          setForgeCursor({

            line: line.number,

            column: pos - line.from + 1,

          })

        }

        if (u.docChanged || u.transactions.some((tr) => tr.effects.length)) {

          if (!isForgeLspLanguage(tab.languageId)) {

            debouncedSyncDiagnostics(u.view, path)

          }

        }

      }),

    ]



    const view = new EditorView({

      state: EditorState.create({

        doc: wsRef.current.getTabContent(path) ?? tab.content,

        extensions,

      }),

      parent: hostRef.current,

    })

    viewRef.current = view



    if (isForgeLspLanguage(tab.languageId)) {

      void forgeLspOpenDocument(

        path,

        tab.languageId,

        wsRef.current.getTabContent(path) ?? tab.content,

      )

    }



    if (forgeRef.current.focusPane === pane) {

      const pos = view.state.selection.main.head

      const line = view.state.doc.lineAt(pos)

      setForgeCursor({

        line: line.number,

        column: pos - line.from + 1,

      })

    }

    if (!isForgeLspLanguage(tab.languageId)) {

      requestAnimationFrame(() => syncDiagnosticsToStore(view, path))

    }

    if (forgeRef.current.focusPane === pane) {

      requestAnimationFrame(() => view.focus())

    }



    return () => {

      debouncedSyncDiagnostics.cancel()

      debouncedLspChange.cancel()

      void forgeLspCloseDocument(path)

      view.destroy()

      if (viewRef.current === view) {

        viewRef.current = null

      }

    }

  }, [

    mountKey,

    pane,

    panePath,

    debouncedSyncDiagnostics,

    debouncedLspChange,

    cmTheme,

  ])



  useEffect(() => {

    const view = viewRef.current

    const path = activePathRef.current

    if (!view || !path || mountedKeyRef.current !== mountKey) return

    if (suppressExternalSyncRef.current) {

      suppressExternalSyncRef.current = false

      return

    }

    const content = wsRef.current.getTabContent(path)

    if (content === undefined) return

    const current = view.state.doc.toString()

    if (current !== content) {

      view.dispatch({

        changes: { from: 0, to: current.length, insert: content },

      })

    }

  }, [externalRevision, mountKey])



  useEffect(() => {

    const target = forge.revealLine

    const path = activePathRef.current

    if (!target || !path || target.path !== path) return

    if (forge.focusPane !== pane) return

    const view = viewRef.current

    if (!view) return

    const lineNo = Math.min(Math.max(1, target.line), view.state.doc.lines)

    const line = view.state.doc.line(lineNo)

    view.dispatch({

      selection: EditorSelection.cursor(line.from),

      effects: EditorView.scrollIntoView(line.from, { y: 'center' }),

    })

    setForgeCursor({ line: lineNo, column: 1 })

    setRevealLineRef.current(null)

  }, [forge.revealLine, forge.focusPane, pane])

  useEffect(() => {
    const view = viewRef.current
    if (!view || forge.focusPane !== pane) return
    requestAnimationFrame(() => view.focus())
  }, [forge.focusPane, pane, panePath])

  const focusEditor = useCallback(() => {
    forge.setFocusPane(pane)
    requestAnimationFrame(() => viewRef.current?.focus())
  }, [forge, pane])

  const focused =

    forge.focusPane === pane ||

    (!forge.editorSplit && pane === 'primary')



  return (

    <div

      className={`forge-editor-pane flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${

        focused ? 'ring-1 ring-inset ring-accent/30' : ''

      }`}

      onMouseDown={() => focusEditor()}

    >

      {forge.editorSplit ? (
        <div className="flex shrink-0 items-center justify-between border-b border-line-subtle/60 bg-sidebar/40 px-2 py-0.5">
          <span className="text-[10px] font-medium text-fg-muted">
            {pane === 'primary'
              ? t('forge.editor.panePrimary')
              : t('forge.editor.paneSecondary')}
          </span>
          <button
            type="button"
            className="text-[10px] text-accent hover:underline"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => focusEditor()}
          >
            {t('forge.editor.clickToEdit')}
          </button>
        </div>
      ) : null}

      <div

        ref={hostRef}

        className={`forge-editor-host h-full min-h-0 w-full text-[13px] ${

          active ? '' : 'hidden'

        }`}

        aria-hidden={!active}

      />

      {!active ? (

        <div className="flex h-full flex-col items-center justify-center gap-3 text-fg-muted">

          <svg

            width="48"

            height="48"

            viewBox="0 0 24 24"

            fill="none"

            className="stroke-current opacity-30"

            strokeWidth="1"

            aria-hidden

          >

            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />

            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />

          </svg>

          <p className="text-[11px]">{t('ide.editor.empty')}</p>

        </div>

      ) : null}

    </div>

  )

}



export const EditorPanel = memo(EditorPanelInner)


