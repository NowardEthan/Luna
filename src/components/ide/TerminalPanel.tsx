import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useLunaWorkspace } from '../../context/LunaWorkspaceContext'
import {
  watchLunaThemeForTerminal,
  xtermThemeFromLunaCss,
} from '../../lib/terminalXtermTheme'

function applyXtermTheme(term: Terminal): void {
  term.options.theme = xtermThemeFromLunaCss()
}

type Props = {
  /** Sem cabeçalho próprio — usado dentro do ForgeBottomPanel. */
  embedded?: boolean
}

export function TerminalPanel({ embedded = false }: Props) {
  const { t } = useTranslation()
  const ws = useLunaWorkspace()
  const hostRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!hostRef.current) return
    const term = new Terminal({
      theme: xtermThemeFromLunaCss(),
      fontSize: 12,
      fontFamily: 'Consolas, "Cascadia Mono", monospace',
      convertEol: true,
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(hostRef.current)
    fit.fit()
    term.writeln(i18n.t('ide.terminal.welcome'))
    termRef.current = term
    fitRef.current = fit

    const unwatchTheme = watchLunaThemeForTerminal(() => {
      applyXtermTheme(term)
    })

    const ro = new ResizeObserver(() => fit.fit())
    ro.observe(hostRef.current)
    return () => {
      unwatchTheme()
      ro.disconnect()
      term.dispose()
      termRef.current = null
    }
  }, [])

  useEffect(() => {
    const term = termRef.current
    if (!term || ws.terminalLines.length === 0) return
    const last = ws.terminalLines[ws.terminalLines.length - 1]
    term.writeln(last.text.replace(/\r?\n$/, ''))
  }, [ws.terminalLines])

  return (
    <div className="luna-terminal-panel flex h-full flex-col bg-composer-well">
      {!embedded ? (
        <div className="flex shrink-0 items-center justify-between border-b border-line px-2 py-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-fg-muted">
            {t('ide.terminal.title')}
          </span>
          <div className="flex gap-1">
            {ws.terminalBusy ? (
              <span className="text-[10px] text-accent">{t('ide.terminal.running')}</span>
            ) : null}
            <button
              type="button"
              onClick={() => ws.clearTerminal()}
              className="luna-btn-ghost px-1.5 py-0.5 text-[10px]"
            >
              {t('ide.terminal.clear')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex shrink-0 items-center justify-end gap-2 border-b border-line-subtle/50 px-2 py-0.5">
          {ws.terminalBusy ? (
            <span className="text-[10px] text-accent">{t('ide.terminal.running')}</span>
          ) : null}
          <button
            type="button"
            onClick={() => ws.clearTerminal()}
            className="luna-btn-ghost px-1.5 py-0.5 text-[10px] text-fg-muted"
          >
            {t('ide.terminal.clear')}
          </button>
        </div>
      )}
      <div ref={hostRef} className="luna-terminal-host min-h-0 flex-1 p-1" />
    </div>
  )
}
