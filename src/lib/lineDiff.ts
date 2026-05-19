export type DiffLineKind = 'add' | 'remove' | 'context'

export type DiffLine = {
  kind: DiffLineKind
  text: string
  oldLine?: number
  newLine?: number
}

const MAX_DIFF_LINES = 160

/** Diff por linhas (LCS simples) para pré-visualização de patches. */
export function computeLineDiff(
  oldText: string,
  newText: string,
): DiffLine[] {
  const a = oldText.split(/\r?\n/)
  const b = newText.split(/\r?\n/)
  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array(m + 1).fill(0),
  )

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const raw: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      raw.push({ kind: 'context', text: a[i], oldLine: i + 1, newLine: j + 1 })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      raw.push({ kind: 'remove', text: a[i], oldLine: i + 1 })
      i++
    } else {
      raw.push({ kind: 'add', text: b[j], newLine: j + 1 })
      j++
    }
  }
  while (i < n) {
    raw.push({ kind: 'remove', text: a[i], oldLine: i + 1 })
    i++
  }
  while (j < m) {
    raw.push({ kind: 'add', text: b[j], newLine: j + 1 })
    j++
  }

  if (raw.length <= MAX_DIFF_LINES) return raw

  const head = raw.slice(0, 72)
  const tail = raw.slice(-72)
  return [
    ...head,
    { kind: 'context', text: `… ${raw.length - 144} linhas omitidas …` },
    ...tail,
  ]
}

export function countDiffChanges(lines: DiffLine[]): {
  added: number
  removed: number
} {
  let added = 0
  let removed = 0
  for (const l of lines) {
    if (l.kind === 'add') added++
    if (l.kind === 'remove') removed++
  }
  return { added, removed }
}
