import {
  applyColorScheme,
  cssVarsForTheme,
  DEFAULT_LUNA_THEME_ID,
  isLunaThemeId,
  LUNA_THEME_CSS_KEYS,
  LUNA_THEME_LIST,
  type LunaThemeId,
} from '../../lib/lunaThemes'
import { eventBus } from '../events/EventBus'
import type { ThemeContribution } from './types'

class ThemeRegistryImpl {
  private readonly themes = new Map<string, ThemeContribution>()
  private activeId: LunaThemeId = DEFAULT_LUNA_THEME_ID

  register(theme: ThemeContribution): void {
    this.themes.set(theme.id, theme)
  }

  unregister(id: string): void {
    this.themes.delete(id)
    if (this.activeId === id) this.setActive(DEFAULT_LUNA_THEME_ID)
  }

  get(id: string): ThemeContribution | undefined {
    return this.themes.get(id)
  }

  list(): ThemeContribution[] {
    return [...this.themes.values()]
  }

  getActiveId(): LunaThemeId {
    return this.activeId
  }

  setActive(id: string): void {
    if (!isLunaThemeId(id) || !this.themes.has(id)) return
    this.activeId = id
    if (typeof document === 'undefined') return

    document.documentElement.setAttribute('data-luna-theme', id)
    applyColorScheme(id)

    const vars = this.themes.get(id)?.cssVars ?? cssVarsForTheme(id)
    const root = document.documentElement
    for (const key of LUNA_THEME_CSS_KEYS) {
      const value = vars[key]
      if (value != null) root.style.setProperty(key, value)
      else root.style.removeProperty(key)
    }
    eventBus.emit('theme:changed', { id })
  }

  /** Aplica tema persistido após registo dos built-ins. */
  bootstrap(id: LunaThemeId): void {
    if (this.themes.has(id)) this.setActive(id)
    else this.setActive(DEFAULT_LUNA_THEME_ID)
  }

  clear(): void {
    this.themes.clear()
    this.activeId = DEFAULT_LUNA_THEME_ID
  }
}

export const themeRegistry = new ThemeRegistryImpl()

/** Regista todos os temas built-in Luna. */
export function registerLunaBuiltinThemes(): void {
  for (const meta of LUNA_THEME_LIST) {
    themeRegistry.register({
      id: meta.id,
      label: meta.label,
      cssVars: meta.cssVars,
    })
  }
}
