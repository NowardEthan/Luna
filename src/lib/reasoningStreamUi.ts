/** Uma linha de preview no summary do badge (≈60–80 caracteres visíveis). */
export function reasoningPreviewLine(text: string, maxLen = 72): string {
  const oneLine = text.replace(/\s+/g, ' ').trim()
  if (oneLine.length <= maxLen) return oneLine
  return `${oneLine.slice(0, maxLen - 1)}…`
}

/** Detecta salto grande (modelo mandou reasoning num único bloco). */
export function isReasoningBulkJump(prevLen: number, nextLen: number): boolean {
  const jump = nextLen - prevLen
  return jump > 48 && prevLen > 0
}
