/** Compara atalho declarado (ex. Ctrl+Shift+H) com keydown. */
export function matchShortcut(
  e: KeyboardEvent,
  spec: string,
): boolean {
  const parts = spec
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return false

  let needCtrl = false
  let needShift = false
  let needAlt = false
  let needMeta = false
  let keyPart = ''

  for (const p of parts) {
    const u = p.toLowerCase()
    if (u === 'ctrl' || u === 'control') needCtrl = true
    else if (u === 'shift') needShift = true
    else if (u === 'alt') needAlt = true
    else if (u === 'meta' || u === 'cmd' || u === 'command') needMeta = true
    else keyPart = p
  }

  if (e.ctrlKey !== needCtrl) return false
  if (e.shiftKey !== needShift) return false
  if (e.altKey !== needAlt) return false
  if (e.metaKey !== needMeta) return false

  if (!keyPart) return true
  const want = keyPart.length === 1 ? keyPart.toLowerCase() : keyPart
  if (want.length === 1) {
    return e.key.toLowerCase() === want
  }
  return e.key === want || e.code === want
}
