import type { ITheme } from '@xterm/xterm'
import { eventBus } from '../core/events/EventBus'

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return value || fallback
}

/** Paleta xterm alinhada às variáveis `--color-*` do tema Luna activo. */
export function xtermThemeFromLunaCss(): ITheme {
  const background = cssVar('--color-composer-well', '#0e0e10')
  const foreground = cssVar('--color-fg', '#ececef')
  const accent = cssVar('--color-accent', '#5eb3f6')
  const muted = cssVar('--color-fg-muted', '#6f6f7a')
  const selectionBackground = cssVar(
    '--color-accent-muted',
    'rgba(94, 179, 246, 0.16)',
  )

  return {
    background,
    foreground,
    cursor: accent,
    cursorAccent: background,
    selectionBackground,
    selectionForeground: foreground,
    black: background,
    red: '#f87171',
    green: '#4ade80',
    yellow: '#facc15',
    blue: accent,
    magenta: '#c084fc',
    cyan: '#22d3ee',
    white: foreground,
    brightBlack: muted,
    brightRed: '#fca5a5',
    brightGreen: '#86efac',
    brightYellow: '#fde047',
    brightBlue: accent,
    brightMagenta: '#d8b4fe',
    brightCyan: '#67e8f9',
    brightWhite: foreground,
  }
}

/** Subscreve mudanças de tema Luna e reaplica o tema do xterm. */
export function watchLunaThemeForTerminal(onChange: () => void): () => void {
  onChange()
  return eventBus.on('theme:changed', () => onChange())
}
