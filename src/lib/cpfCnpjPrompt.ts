import {
  isValidCpfCnpj,
  normalizeCpfCnpj,
  readSavedCpfCnpj,
  saveCpfCnpj,
} from '../features/billing/cpfCnpj'

export type CpfCnpjPromptState = {
  open: boolean
  error: string | null
}

type Listener = () => void

let state: CpfCnpjPromptState = { open: false, error: null }
let resolver: ((value: string | null) => void) | null = null
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((l) => l())
}

export function subscribeCpfCnpjPrompt(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getCpfCnpjPromptState(): CpfCnpjPromptState {
  return state
}

export function resolveCpfCnpjPrompt(value: string | null): void {
  if (value) saveCpfCnpj(value)
  state = { open: false, error: null }
  emit()
  resolver?.(value)
  resolver = null
}

export function setCpfCnpjPromptError(error: string | null): void {
  state = { ...state, error }
  emit()
}

export function submitCpfCnpjPrompt(raw: string): void {
  const digits = normalizeCpfCnpj(raw)
  if (!isValidCpfCnpj(digits)) {
    setCpfCnpjPromptError('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.')
    return
  }
  resolveCpfCnpjPrompt(digits)
}

/** Pede CPF/CNPJ via modal (reutiliza o guardado se existir). */
export function requestCpfCnpj(): Promise<string | null> {
  const saved = readSavedCpfCnpj()
  if (saved) return Promise.resolve(saved)

  return new Promise((resolve) => {
    resolver = resolve
    state = { open: true, error: null }
    emit()
  })
}
