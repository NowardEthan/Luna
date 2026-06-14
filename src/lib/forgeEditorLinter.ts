import { linter, type Diagnostic } from '@codemirror/lint'
import { jsonParseLinter } from '@codemirror/lang-json'
import { isForgeLspLanguage } from './forgeLspClient'

const BRACKET_PAIRS: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
}

/** Lint leve — JSON + brackets; TS/JS delegam diagnostics ao LSP quando disponível. */
function basicBracketLinter(doc: string): Diagnostic[] {
  const stack: { ch: string; pos: number }[] = []
  const diags: Diagnostic[] = []

  for (let i = 0; i < doc.length; i++) {
    const ch = doc[i]!
    if (ch in BRACKET_PAIRS) {
      stack.push({ ch, pos: i })
      continue
    }
    const open = Object.entries(BRACKET_PAIRS).find(([, close]) => close === ch)
    if (!open) continue
    const [openCh] = open
    const last = stack.pop()
    if (!last || last.ch !== openCh) {
      diags.push({
        from: i,
        to: i + 1,
        severity: 'error',
        message: `Bracket '${ch}' sem correspondência`,
      })
    }
  }

  for (const leftover of stack) {
    diags.push({
      from: leftover.pos,
      to: leftover.pos + 1,
      severity: 'warning',
      message: `Bracket '${leftover.ch}' não fechado`,
    })
  }

  return diags
}

export function buildForgeLinter(languageId: string) {
  const jsonLint = languageId === 'json' ? jsonParseLinter() : null
  const lspHandles =
    window.forgeLsp && isForgeLspLanguage(languageId) && languageId !== 'json'

  return linter(
    (view) => {
      if (lspHandles) return []
      const doc = view.state.doc.toString()
      const out: Diagnostic[] = []
      if (jsonLint) out.push(...jsonLint(view))
      if (
        languageId === 'javascript' ||
        languageId === 'typescript' ||
        languageId === 'json' ||
        languageId === 'css'
      ) {
        out.push(...basicBracketLinter(doc))
      }
      return out
    },
    { delay: 400 },
  )
}
