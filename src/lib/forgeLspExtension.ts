import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete'
import { Facet } from '@codemirror/state'
import { hoverTooltip, type Tooltip } from '@codemirror/view'
import {
  forgeLspCompletion,
  forgeLspDefinition,
  forgeLspHover,
  isForgeLspLanguage,
} from './forgeLspClient'

export const editorFilePathFacet = Facet.define<string, string>({
  combine: (values) => values[0] ?? '',
})

export const editorLanguageFacet = Facet.define<string, string>({
  combine: (values) => values[0] ?? 'plaintext',
})

function parseHoverResult(result: unknown): string | null {
  if (!result || typeof result !== 'object') return null
  const contents = (result as { contents?: unknown }).contents
  if (typeof contents === 'string') return contents
  if (Array.isArray(contents)) {
    const parts = contents
      .map((c) => {
        if (typeof c === 'string') return c
        if (c && typeof c === 'object' && 'value' in c) {
          return String((c as { value?: string }).value ?? '')
        }
        return ''
      })
      .filter(Boolean)
    return parts.length ? parts.join('\n\n') : null
  }
  if (contents && typeof contents === 'object' && 'value' in contents) {
    return String((contents as { value?: string }).value ?? '')
  }
  return null
}

function lspItemsToCompletions(result: unknown): Completion[] {
  if (!result) return []
  const items = Array.isArray(result)
    ? result
    : (result as { items?: unknown[] }).items
  if (!Array.isArray(items)) return []
  const out: Completion[] = []
  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const label =
      typeof (item as { label?: string }).label === 'string'
        ? (item as { label: string }).label
        : typeof (item as { textEdit?: { newText?: string } }).textEdit
            ?.newText === 'string'
          ? (item as { textEdit: { newText: string } }).textEdit.newText
          : null
    if (!label) continue
    const detail =
      typeof (item as { detail?: string }).detail === 'string'
        ? (item as { detail: string }).detail
        : undefined
    const info =
      typeof (item as { documentation?: string | { value?: string } })
        .documentation === 'string'
        ? (item as { documentation: string }).documentation
        : typeof (item as { documentation?: { value?: string } }).documentation
              ?.value === 'string'
          ? (item as { documentation: { value: string } }).documentation.value
          : undefined
    out.push({
      label,
      detail,
      info,
      type: (item as { kind?: number }).kind ? 'property' : 'text',
    })
  }
  return out
}

async function lspCompletionSource(
  ctx: CompletionContext,
): Promise<CompletionResult | null> {
  const path = ctx.state.facet(editorFilePathFacet)
  const languageId = ctx.state.facet(editorLanguageFacet)
  if (!path || !isForgeLspLanguage(languageId)) return null
  const pos = ctx.state.selection.main.head
  const line = ctx.state.doc.lineAt(pos)
  const result = await forgeLspCompletion(
    path,
    line.number,
    pos - line.from + 1,
  )
  const options = lspItemsToCompletions(result)
  if (!options.length) return null
  const from = ctx.matchBefore(/[\w$]+/)?.from ?? pos
  return { from, options, validFor: /^[\w$]*$/ }
}

export function buildForgeLspExtensions(
  filePath: string,
  languageId: string,
) {
  if (!isForgeLspLanguage(languageId) || !window.forgeLsp) return []
  return [
    editorFilePathFacet.of(filePath),
    editorLanguageFacet.of(languageId),
    autocompletion({
      activateOnTyping: true,
      override: [lspCompletionSource],
    }),
    hoverTooltip(
      async (view, pos): Promise<Tooltip | null> => {
        const path = view.state.facet(editorFilePathFacet)
        const lang = view.state.facet(editorLanguageFacet)
        if (!path || !isForgeLspLanguage(lang)) return null
        const line = view.state.doc.lineAt(pos)
        const result = await forgeLspHover(
          path,
          line.number,
          pos - line.from + 1,
        )
        const text = parseHoverResult(result)
        if (!text?.trim()) return null
        return {
          pos,
          above: true,
          create() {
            const dom = document.createElement('div')
            dom.className = 'forge-lsp-hover'
            dom.textContent = text
            return { dom }
          },
        }
      },
      { hoverTime: 400 },
    ),
  ]
}

export async function runForgeLspDefinition(
  filePath: string,
  languageId: string,
  line: number,
  column: number,
): Promise<string | null> {
  if (!isForgeLspLanguage(languageId)) return null
  const result = await forgeLspDefinition(filePath, line, column)
  if (!result) return null
  const loc = Array.isArray(result) ? result[0] : result
  if (!loc || typeof loc !== 'object') return null
  const uri = (loc as { uri?: string }).uri
  if (typeof uri !== 'string') return null
  try {
    const u = new URL(uri)
    let p = decodeURIComponent(u.pathname)
    if (/^\/[A-Za-z]:/.test(p)) p = p.slice(1)
    return p.replace(/\//g, '\\')
  } catch {
    return null
  }
}
