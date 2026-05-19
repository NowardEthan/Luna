import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { tags as t } from '@lezer/highlight'
import { EditorView } from '@codemirror/view'
import { isLunaDarkTheme } from './lunaThemes'

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return value || fallback
}

export { isLunaDarkTheme }

const highlightDark = HighlightStyle.define([
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

const highlightLight = HighlightStyle.define([
  { tag: [t.comment, t.lineComment, t.blockComment], color: '#008000', fontStyle: 'italic' },
  { tag: [t.keyword, t.modifier, t.self], color: '#0000ff' },
  { tag: [t.controlKeyword, t.moduleKeyword], color: '#af00db' },
  { tag: [t.operator, t.compareOperator, t.logicOperator], color: '#333333' },
  { tag: [t.definitionKeyword], color: '#0000ff' },
  { tag: [t.className, t.typeName, t.namespace], color: '#267f99' },
  { tag: [t.definition(t.typeName), t.standard(t.typeName)], color: '#267f99' },
  { tag: [t.function(t.variableName), t.definition(t.function(t.variableName))], color: '#795e26' },
  { tag: [t.propertyName, t.attributeName], color: '#001080' },
  { tag: [t.variableName, t.definition(t.variableName)], color: '#001080' },
  { tag: [t.local(t.variableName)], color: '#001080' },
  { tag: t.special(t.variableName), color: '#001080' },
  { tag: [t.string, t.special(t.string)], color: '#a31515' },
  { tag: [t.number, t.integer, t.float], color: '#098658' },
  { tag: [t.bool, t.null, t.atom], color: '#0000ff' },
  { tag: [t.regexp, t.escape], color: '#811f3f' },
  { tag: [t.tagName], color: '#800000' },
  { tag: [t.angleBracket], color: '#800000' },
  { tag: [t.attributeValue], color: '#0451a5' },
  { tag: [t.meta, t.processingInstruction], color: '#808080' },
  { tag: [t.punctuation, t.bracket, t.separator], color: '#333333' },
  { tag: [t.heading, t.strong], color: '#0000ff', fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.link, color: '#0451a5', textDecoration: 'underline' },
  { tag: t.invalid, color: '#cd3131', textDecoration: 'underline wavy' },
])

/** Tema do editor IDE — cores do tema Luna activo. */
export function buildLunaCodeMirrorExtensions(): Extension[] {
  const dark = isLunaDarkTheme()
  const bg = cssVar('--color-surface', dark ? '#1e1e22' : '#ffffff')
  const fg = cssVar('--color-fg', dark ? '#ececef' : '#1a1a1f')
  const fgMuted = cssVar('--color-fg-muted', dark ? '#6f6f7a' : '#737380')
  const gutterBg = cssVar('--color-sidebar', dark ? '#121214' : '#ebebed')
  const activeLine = cssVar('--color-raised', dark ? '#26262c' : '#f0f0f3')
  const activeGutter = cssVar('--color-raised-hover', dark ? '#303038' : '#e4e4ea')
  const accent = cssVar('--color-accent', '#5eb3f6')
  const selection = cssVar('--color-accent-muted', 'rgba(94, 179, 246, 0.16)')

  const chrome = EditorView.theme(
    {
      '&': {
        height: '100%',
        backgroundColor: bg,
        color: fg,
      },
      '&.cm-focused': { outline: 'none' },
      '.cm-scroller': {
        fontFamily:
          'Consolas, "Cascadia Mono", "Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
        lineHeight: '1.55',
      },
      '.cm-content': { caretColor: fg, padding: '8px 0' },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: accent,
        borderLeftWidth: '2px',
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
        backgroundColor: `${selection} !important`,
      },
      '.cm-activeLine': { backgroundColor: activeLine },
      '.cm-gutters': {
        backgroundColor: gutterBg,
        color: fgMuted,
        border: 'none',
      },
      '.cm-activeLineGutter': {
        backgroundColor: activeGutter,
        color: fg,
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 10px 0 12px',
        minWidth: '2.5em',
      },
      '.cm-foldGutter .cm-gutterElement': { padding: '0 4px' },
      '.cm-matchingBracket': {
        backgroundColor: `${accent}40`,
        outline: `1px solid ${accent}80`,
      },
    },
    { dark },
  )

  return [
    chrome,
    syntaxHighlighting(dark ? highlightDark : highlightLight, { fallback: true }),
  ]
}

/** Blocos de código no chat (readonly). */
export function buildMarkdownCodeBlockExtensions(
  compact: boolean,
): Extension[] {
  const dark = isLunaDarkTheme()
  const activeLine = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'

  const readOnlyChrome = EditorView.theme(
    {
      '&': {
        backgroundColor: 'transparent',
        fontSize: compact ? '11px' : '12.5px',
      },
      '&.cm-focused': { outline: 'none' },
      '.cm-scroller': {
        overflow: 'auto',
        fontFamily:
          'ui-monospace, "Cascadia Code", "Cascadia Mono", Consolas, "JetBrains Mono", monospace',
        lineHeight: '1.55',
      },
      '.cm-content': {
        padding: compact ? '8px 0' : '10px 0',
        caretColor: 'transparent',
      },
      '.cm-line': { padding: '0 12px 0 4px' },
      '.cm-gutters': {
        backgroundColor: 'transparent',
        border: 'none',
        color: 'var(--color-fg-muted)',
      },
      '.cm-gutterElement': { padding: '0 8px 0 10px', minWidth: '2.25rem' },
      '.cm-activeLine': { backgroundColor: activeLine },
      '.cm-activeLineGutter': { backgroundColor: activeLine },
    },
    { dark },
  )

  return [
    syntaxHighlighting(dark ? highlightDark : highlightLight, { fallback: true }),
    readOnlyChrome,
  ]
}

/** @deprecated Use buildLunaCodeMirrorExtensions() — mantido para imports antigos. */
export const lunaCodeMirrorTheme = buildLunaCodeMirrorExtensions()
