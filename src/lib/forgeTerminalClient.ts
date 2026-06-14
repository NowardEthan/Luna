export type ForgeTerminalCreateResult = {
  ok: boolean
  error?: string
  id?: string
  shell?: string
  cwd?: string
}

export type ForgeTerminalDataPayload = {
  id: string
  data?: string
  exitCode?: number
}

export function isForgeTerminalAvailable(): boolean {
  return Boolean(window.forgeTerminal?.create)
}

export function ensureForgeTerminalDataListener(
  onData: (payload: ForgeTerminalDataPayload) => void,
): () => void {
  if (!window.forgeTerminal?.onData) return () => {}
  return window.forgeTerminal.onData(onData)
}

export async function forgeTerminalCreate(opts: {
  cwd?: string | null
  cols?: number
  rows?: number
}): Promise<ForgeTerminalCreateResult> {
  if (!window.forgeTerminal?.create) {
    return { ok: false, error: 'Terminal PTY só disponível no Orbit (Electron).' }
  }
  return window.forgeTerminal.create({
    cwd: opts.cwd ?? undefined,
    cols: opts.cols,
    rows: opts.rows,
  })
}

export async function forgeTerminalWrite(
  id: string,
  data: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!window.forgeTerminal?.write) return { ok: false, error: 'Indisponível' }
  return window.forgeTerminal.write(id, data)
}

export async function forgeTerminalResize(
  id: string,
  cols: number,
  rows: number,
): Promise<{ ok: boolean; error?: string }> {
  if (!window.forgeTerminal?.resize) return { ok: false, error: 'Indisponível' }
  return window.forgeTerminal.resize(id, cols, rows)
}

export async function forgeTerminalKill(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!window.forgeTerminal?.kill) return { ok: true }
  return window.forgeTerminal.kill(id)
}
