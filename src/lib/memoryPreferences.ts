const STORAGE_AUTO_CAPTURE = 'luna-auto-memory-capture'

export {
  isSubstantiveUserTurn,
  shouldReviewMemoryForTurn,
} from './memoryHeuristics'

/** Revisão automática do turno para gravar factos (quando o modelo não chamou save_memory). */
export function readAutoMemoryCaptureEnabled(): boolean {
  try {
    const v = globalThis.localStorage?.getItem(STORAGE_AUTO_CAPTURE)
    if (v === '0') return false
    if (v === '1') return true
  } catch {
    /* ignore */
  }
  return true
}

export function writeAutoMemoryCaptureEnabled(enabled: boolean): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_AUTO_CAPTURE, enabled ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/** Pedido explícito para lembrar / gravar. */
export function userAskedToRemember(text: string): boolean {
  const t = text.trim().toLowerCase()
  if (t.length < 4) return false
  if (/\b(n[aã]o\s+esque[cç]as?|nunca\s+esque[cç]a)\b/.test(t)) return true
  if (
    /\b(lembra|lembrar|memoriza|memorizar|guarda|guardar|anota|anotar|salva|salvar|registra)\b/.test(
      t,
    ) &&
    t.length <= 120
  ) {
    return true
  }
  return (
    /\b(lembra|lembrar|memoriza|memorizar|guarda|guardar|anota|anotar|salva|salvar)\b/.test(
      t,
    ) &&
    /\b(mem[oó]ria|isso|isto|daqui|depois|sempre|nome|prefer[eê]ncia)\b/.test(t)
  )
}
