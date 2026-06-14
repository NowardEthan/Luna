export type ForgeOutputChannel = 'agent' | 'build' | 'luna'

export type ForgeOutputLine = {
  channel: ForgeOutputChannel
  stream: 'stdout' | 'stderr' | 'info'
  text: string
  ts: number
}

const MAX_LINES = 4000

let lines: ForgeOutputLine[] = []
let revision = 0
const listeners = new Set<() => void>()

function emit() {
  revision++
  listeners.forEach((l) => l())
}

export function getForgeOutputRevision(): number {
  return revision
}

export function subscribeForgeOutput(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getForgeOutputLines(
  channel?: ForgeOutputChannel,
): ForgeOutputLine[] {
  if (!channel) return lines
  return lines.filter((l) => l.channel === channel)
}

export function appendForgeOutput(
  channel: ForgeOutputChannel,
  stream: ForgeOutputLine['stream'],
  text: string,
): void {
  const trimmed = String(text ?? '')
  if (!trimmed) return
  const parts = trimmed.split(/\r?\n/)
  for (const part of parts) {
    if (!part.length && parts.length > 1) continue
    lines.push({
      channel,
      stream,
      text: part,
      ts: Date.now(),
    })
  }
  if (lines.length > MAX_LINES) {
    lines = lines.slice(-MAX_LINES)
  }
  emit()
}

export function clearForgeOutput(channel?: ForgeOutputChannel): void {
  if (!channel) {
    lines = []
  } else {
    lines = lines.filter((l) => l.channel !== channel)
  }
  emit()
}
