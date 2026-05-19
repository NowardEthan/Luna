import { describe, expect, it } from 'vitest'
import {
  cssVarsForTheme,
  cycleLunaTheme,
  LUNA_THEME_LIST,
} from './lunaThemes'

describe('lunaThemes', () => {
  it('lists nine built-in themes', () => {
    expect(LUNA_THEME_LIST).toHaveLength(9)
    expect(LUNA_THEME_LIST.map((t) => t.id)).toContain('luna-contrast')
  })

  it('cycles through themes', () => {
    const first = LUNA_THEME_LIST[0]!.id
    const second = cycleLunaTheme(first)
    expect(second).not.toBe(first)
    expect(LUNA_THEME_LIST.map((t) => t.id)).toContain(second)
  })

  it('provides distinct palettes', () => {
    const dark = cssVarsForTheme('luna-dark')
    const light = cssVarsForTheme('luna-light')
    const contrast = cssVarsForTheme('luna-contrast')
    expect(dark['--color-canvas']).not.toBe(light['--color-canvas'])
    expect(contrast['--color-accent']).toBe('#ffff00')
  })
})
