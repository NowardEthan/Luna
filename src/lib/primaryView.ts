export type LunaPrimaryView = 'conversation' | 'marketplace' | 'finances'

const STORAGE_KEY = 'luna-primary-view'

export function readPrimaryView(): LunaPrimaryView {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'marketplace') return 'marketplace'
    if (v === 'finances') return 'finances'
    return 'conversation'
  } catch {
    return 'conversation'
  }
}

export function writePrimaryView(view: LunaPrimaryView): void {
  try {
    localStorage.setItem(STORAGE_KEY, view)
  } catch {
    /* ignore */
  }
}
