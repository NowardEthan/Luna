const STORAGE_KEY = 'luna-billing-cpfcnpj'

export function normalizeCpfCnpj(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function isValidCpfCnpj(digits: string): boolean {
  return digits.length === 11 || digits.length === 14
}

export function readSavedCpfCnpj(): string | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (!v) return null
    const digits = normalizeCpfCnpj(v)
    return isValidCpfCnpj(digits) ? digits : null
  } catch {
    return null
  }
}

export function saveCpfCnpj(digits: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, digits)
  } catch {
    /* ignore */
  }
}

