export type LunaPrimaryView = 'conversation' | 'marketplace'

const STORAGE_KEY = 'luna-primary-view'

export function readPrimaryView(): LunaPrimaryView {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'marketplace' ? 'marketplace' : 'conversation'
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
