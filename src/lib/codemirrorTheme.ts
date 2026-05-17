import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { EditorView } from '@codemirror/view'

/** Cores de tokens inspiradas no VS Code Dark+. */
const lunaHighlightStyle = HighlightStyle.define([
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#6a9955', fontStyle: 'italic' },
  { tag: [t.keyword, t.modifier, t.self], color: '#569cd6' },
  { tag: [t.controlKeyword, t.moduleKeyword], color: '#c586c0' },
  { tag: [t.operator, t.compareOperator, t.logicOperator], color: '#d4d4d4' },
  { tag: [t.definitionKeyword], color: '#569cd6' },
  { tag: [t.className, t.typeName, t.namespace], color: '#4ec9b0' },
  { tag: [t.definition(t.typeName), t.standard(t.typeName)], color: '#4ec9b0' },
  { tag: [t.function(t.variableName), t.definition(t.function(t.variableName))], color: '#dcdcaa' },
  { tag: [t.propertyName, t.attributeName], color: '#9cdcfe' },
  { tag: [t.variableName, t.definition(t.variableName)], color: '#9cdcfe' },
  { tag: [t.local(t.variableName)], color: '#9cdcfe' },
  { tag: t.special(t.variableName), color: '#9cdcfe' },
  { tag: [t.string, t.special(t.string)], color: '#ce9178' },
  { tag: [t.number, t.integer, t.float], color: '#b5cea8' },
  { tag: [t.bool, t.null, t.atom], color: '#569cd6' },
  { tag: [t.regexp, t.escape], color: '#d16969' },
  { tag: [t.tagName], color: '#569cd6' },
  { tag: [t.angleBracket], color: '#808080' },
  { tag: [t.attributeValue], color: '#ce9178' },
  { tag: [t.meta, t.processingInstruction], color: '#808080' },
  { tag: [t.punctuation, t.bracket, t.separator], color: '#d4d4d4' },
  { tag: [t.heading, t.strong], color: '#569cd6', fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.link, color: '#569cd6', textDecoration: 'underline' },
  { tag: t.invalid, color: '#f44747', textDecoration: 'underline wavy' },
])

const editorChrome = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: '#1a1a1a',
      color: '#d4d4d4',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': {
      fontFamily:
        'Consolas, "Cascadia Mono", "Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
      lineHeight: '1.55',
    },
    '.cm-content': { caretColor: '#aeafad', padding: '8px 0' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#aeafad', borderLeftWidth: '2px' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: '#264f78 !important',
    },
    '.cm-activeLine': { backgroundColor: '#2a2a2a' },
    '.cm-gutters': {
      backgroundColor: '#141414',
      color: '#6e6e78',
      border: 'none',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#1f1f1f',
      color: '#9d9da3',
    },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 12px', minWidth: '2.5em' },
    '.cm-foldGutter .cm-gutterElement': { padding: '0 4px' },
    '.cm-matchingBracket': {
      backgroundColor: 'rgba(86, 156, 214, 0.25)',
      outline: '1px solid rgba(86, 156, 214, 0.5)',
    },
  },
  { dark: true },
)

export const lunaCodeMirrorTheme = [
  editorChrome,
  syntaxHighlighting(lunaHighlightStyle, { fallback: true }),
]
