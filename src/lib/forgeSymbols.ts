export type ForgeSymbol = {
  name: string
  kind: 'function' | 'class' | 'interface' | 'type' | 'const' | 'method'
  line: number
}

const PATTERNS: { kind: ForgeSymbol['kind']; re: RegExp }[] = [
  { kind: 'class', re: /^\s*(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/ },
  { kind: 'interface', re: /^\s*(?:export\s+)?interface\s+(\w+)/ },
  { kind: 'type', re: /^\s*(?:export\s+)?type\s+(\w+)/ },
  {
    kind: 'function',
    re: /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
  },
  {
    kind: 'const',
    re: /^\s*(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/,
  },
  {
    kind: 'method',
    re: /^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::|{)/,
  },
]

/** Extracção leve de símbolos para o painel Outline (sem LSP). */
export function extractSymbols(content: string): ForgeSymbol[] {
  const lines = content.split(/\r?\n/)
  const symbols: ForgeSymbol[] = []
  const seen = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    for (const { kind, re } of PATTERNS) {
      const m = line.match(re)
      if (!m?.[1]) continue
      const name = m[1]
      const key = `${kind}:${name}:${i}`
      if (seen.has(key)) continue
      seen.add(key)
      symbols.push({ name, kind, line: i + 1 })
      break
    }
  }

  return symbols
}
