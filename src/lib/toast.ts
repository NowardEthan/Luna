export type ToastKind = 'info' | 'success' | 'error'

export type ToastItem = {
  id: string
  message: string
  kind: ToastKind
}

type Listener = () => void

let toasts: ToastItem[] = []
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((l) => l())
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getToasts(): ToastItem[] {
  return toasts
}

export function showToast(
  message: string,
  kind: ToastKind = 'info',
  durationMs = 3200,
): void {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  toasts = [...toasts, { id, message, kind }]
  emit()
  window.setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  }, durationMs)
}

export async function copyWithToast(text: string, successMessage = 'Copiado para a área de transferência'): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    showToast(successMessage, 'success')
    return true
  } catch {
    showToast('Não foi possível copiar', 'error')
    return false
  }
}
