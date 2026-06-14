import { RangeSet } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  gutter,
  GutterMarker,
  ViewPlugin,
  WidgetType,
} from '@codemirror/view'
import type { PatchProposal } from '../context/LunaWorkspaceContext'
import { computeLineDiff } from './lineDiff'

const diffAddLine = Decoration.line({ class: 'forge-diff-line-add' })
const diffRemoveLine = Decoration.line({ class: 'forge-diff-line-remove' })

class DiffActionMarker extends GutterMarker {
  label: string
  className: string
  action: () => void

  constructor(label: string, className: string, action: () => void) {
    super()
    this.label = label
    this.className = className
    this.action = action
  }

  toDOM() {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = `forge-diff-gutter-btn ${this.className}`
    btn.textContent = this.label
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.action()
    })
    return btn
  }
}

class DiffBannerWidget extends WidgetType {
  summary: string
  changeCount: number
  onAccept: () => void
  onReject: () => void

  constructor(
    summary: string,
    changeCount: number,
    onAccept: () => void,
    onReject: () => void,
  ) {
    super()
    this.summary = summary
    this.changeCount = changeCount
    this.onAccept = onAccept
    this.onReject = onReject
  }

  eq(other: DiffBannerWidget) {
    return (
      other.summary === this.summary &&
      other.changeCount === this.changeCount
    )
  }

  toDOM() {
    const wrap = document.createElement('div')
    wrap.className = 'forge-diff-banner'
    const label = document.createElement('span')
    label.className = 'forge-diff-banner-label'
    label.textContent = `${this.summary} · ${this.changeCount} alteração(ões)`
    const actions = document.createElement('div')
    actions.className = 'forge-diff-banner-actions'
    const accept = document.createElement('button')
    accept.type = 'button'
    accept.className = 'forge-diff-banner-accept'
    accept.textContent = 'Aceitar'
    accept.addEventListener('click', () => this.onAccept())
    const reject = document.createElement('button')
    reject.type = 'button'
    reject.className = 'forge-diff-banner-reject'
    reject.textContent = 'Rejeitar'
    reject.addEventListener('click', () => this.onReject())
    actions.append(accept, reject)
    wrap.append(label, actions)
    return wrap
  }

  ignoreEvent() {
    return false
  }
}

function buildDiffDecorations(
  view: EditorView,
  patch: PatchProposal,
  onAccept: () => void,
  onReject: () => void,
): DecorationSet {
  const lines = computeLineDiff(patch.oldContent, patch.newContent)
  const decs: ReturnType<Decoration['range']>[] = []
  const changedNewLines = new Set<number>()
  let changeCount = 0

  for (const line of lines) {
    if (line.kind === 'add' && line.newLine) {
      changedNewLines.add(line.newLine)
      changeCount++
    }
    if (line.kind === 'remove') changeCount++
  }

  for (const lineNo of changedNewLines) {
    if (lineNo < 1 || lineNo > view.state.doc.lines) continue
    const line = view.state.doc.line(lineNo)
    decs.push(diffAddLine.range(line.from))
  }

  for (const line of lines) {
    if (line.kind !== 'remove' || !line.oldLine) continue
    const lineNo = Math.min(line.oldLine, view.state.doc.lines)
    if (lineNo < 1) continue
    const docLine = view.state.doc.line(lineNo)
    decs.push(diffRemoveLine.range(docLine.from))
  }

  if (changeCount > 0) {
    decs.push(
      Decoration.widget({
        widget: new DiffBannerWidget(patch.summary, changeCount, onAccept, onReject),
        block: true,
        side: -1,
      }).range(0),
    )
  }

  return Decoration.set(decs, true)
}

function firstChangedLine(patch: PatchProposal): number | null {
  const lines = computeLineDiff(patch.oldContent, patch.newContent)
  for (const l of lines) {
    if (l.kind === 'add' && l.newLine) return l.newLine
    if (l.kind === 'remove' && l.oldLine) return l.oldLine
  }
  return null
}

export function buildForgeInlineDiffExtension(
  patch: PatchProposal | null,
  onAccept: (id: string) => void,
  onReject: (id: string) => void,
) {
  if (!patch) return []

  const activePatch: PatchProposal = patch
  const accept = () => onAccept(activePatch.id)
  const reject = () => onReject(activePatch.id)
  const lineNo = firstChangedLine(activePatch)

  return [
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet

        constructor(view: EditorView) {
          this.decorations = buildDiffDecorations(
            view,
            activePatch,
            accept,
            reject,
          )
        }

        update(update: { docChanged: boolean; view: EditorView }) {
          if (update.docChanged) {
            this.decorations = buildDiffDecorations(
              update.view,
              activePatch,
              accept,
              reject,
            )
          }
        }
      },
      { decorations: (v) => v.decorations },
    ),
    gutter({
      class: 'forge-diff-gutter',
      markers(view) {
        if (!lineNo || lineNo > view.state.doc.lines) return RangeSet.empty
        const line = view.state.doc.line(lineNo)
        return RangeSet.of([
          new DiffActionMarker('✓', 'forge-diff-gutter-accept', accept).range(
            line.from,
          ),
          new DiffActionMarker('✕', 'forge-diff-gutter-reject', reject).range(
            line.from,
          ),
        ])
      },
      initialSpacer: () =>
        new DiffActionMarker('·', 'forge-diff-gutter-spacer', () => {}),
    }),
  ]
}
