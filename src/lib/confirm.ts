import i18n from '../i18n'

export type ConfirmOptions = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

export type ConfirmState = ConfirmOptions & {
  open: boolean
}

type Listener = () => void

let state: ConfirmState = { open: false, title: '', message: '' }
let resolver: ((value: boolean) => void) | null = null
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((l) => l())
}

export function subscribeConfirm(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getConfirmState(): ConfirmState {
  return state
}

export function requestConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    resolver = resolve
    state = {
      open: true,
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? i18n.t('confirm.confirm'),
      cancelLabel: options.cancelLabel ?? i18n.t('confirm.cancel'),
      destructive: options.destructive ?? false,
    }
    emit()
  })
}

export function resolveConfirm(confirmed: boolean): void {
  state = { ...state, open: false }
  emit()
  resolver?.(confirmed)
  resolver = null
}
