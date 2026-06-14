import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useForgeLayout } from '../../../context/ForgeLayoutContext'
import { useLunaWorkspace } from '../../../context/LunaWorkspaceContext'
import {
  ensureForgeTerminalDataListener,
  forgeTerminalCreate,
  forgeTerminalKill,
  forgeTerminalResize,
  forgeTerminalWrite,
  isForgeTerminalAvailable,
} from '../../../lib/forgeTerminalClient'
import {
  watchLunaThemeForTerminal,
  xtermThemeFromLunaCss,
} from '../../../lib/terminalXtermTheme'

type TerminalSession = {
  localId: string
  ptyId: string | null
  title: string
}

function nextLocalId(): string {
  return `term-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function defaultTitle(index: number): string {
  return index <= 1 ? 'Terminal 1' : `Terminal ${index}`
}

function InteractiveTerminal({
  session,
  cwd,
  visible,
  onPtyId,
  onTitle,
}: {
  session: TerminalSession
  cwd: string | null
  visible: boolean
  onPtyId: (localId: string, ptyId: string) => void
  onTitle: (localId: string, title: string) => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const ptyIdRef = useRef<string | null>(null)
  const onPtyIdRef = useRef(onPtyId)
  const onTitleRef = useRef(onTitle)
  onPtyIdRef.current = onPtyId
  onTitleRef.current = onTitle

  useEffect(() => {
    if (!hostRef.current || !isForgeTerminalAvailable()) return

    const term = new Terminal({
      theme: xtermThemeFromLunaCss(),
      fontSize: 12,
      fontFamily: 'Consolas, "Cascadia Mono", monospace',
      cursorBlink: true,
      scrollback: 5000,
      disableStdin: false,
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(hostRef.current)
    termRef.current = term
    fitRef.current = fit

    const unwatchTheme = watchLunaThemeForTerminal(() => {
      term.options.theme = xtermThemeFromLunaCss()
    })

    let disposed = false
    ptyIdRef.current = null

    const fitTerminal = () => {
      if (!hostRef.current || !fitRef.current) return
      try {
        fitRef.current.fit()
      } catch {
        /* host pode ter tamanho 0 enquanto oculto */
      }
    }

    const ensurePty = async () => {
      if (ptyIdRef.current || disposed) return
      fitTerminal()
      const dims = fitRef.current?.proposeDimensions()
      const r = await forgeTerminalCreate({
        cwd,
        cols: dims?.cols ?? 80,
        rows: dims?.rows ?? 24,
      })
      if (disposed) {
        if (r.ok && r.id) void forgeTerminalKill(r.id)
        return
      }
      if (!r.ok || !r.id) {
        term.writeln(`\r\n\x1b[31m${r.error ?? 'Falha ao iniciar shell.'}\x1b[0m`)
        return
      }
      ptyIdRef.current = r.id
      onPtyIdRef.current(session.localId, r.id)
      if (r.shell) {
        onTitleRef.current(
          session.localId,
          r.shell.split(/[/\\]/).pop() || session.title,
        )
      }
    }

    void ensurePty()

    const dataDisposable = term.onData((data) => {
      const id = ptyIdRef.current
      if (id) void forgeTerminalWrite(id, data)
    })

    const resize = () => {
      fitTerminal()
      const id = ptyIdRef.current
      const dims = fitRef.current?.proposeDimensions()
      if (id && dims) {
        void forgeTerminalResize(id, dims.cols, dims.rows)
      }
    }

    const ro = new ResizeObserver(() => resize())
    ro.observe(hostRef.current)

    requestAnimationFrame(() => {
      fitTerminal()
      if (visible) term.focus()
    })

    return () => {
      disposed = true
      dataDisposable.dispose()
      unwatchTheme()
      ro.disconnect()
      const id = ptyIdRef.current
      if (id) void forgeTerminalKill(id)
      ptyIdRef.current = null
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [session.localId, cwd])

  useEffect(() => {
    return ensureForgeTerminalDataListener((payload) => {
      const term = termRef.current
      if (!term || payload.id !== ptyIdRef.current) return
      if (payload.data) term.write(payload.data)
      if (payload.exitCode !== undefined) {
        term.writeln(
          `\r\n\x1b[90m[processo terminou: código ${payload.exitCode}]\x1b[0m`,
        )
        ptyIdRef.current = null
      }
    })
  }, [session.localId])

  useEffect(() => {
    if (!visible || !termRef.current || !fitRef.current) return
    requestAnimationFrame(() => {
      try {
        fitRef.current?.fit()
      } catch {
        /* ignore */
      }
      termRef.current?.focus()
      const id = ptyIdRef.current
      const dims = fitRef.current?.proposeDimensions()
      if (id && dims) {
        void forgeTerminalResize(id, dims.cols, dims.rows)
      }
    })
  }, [visible])

  return (
    <div
      ref={hostRef}
      className="luna-terminal-host h-full min-h-0 w-full flex-1 p-1"
      onMouseDown={() => termRef.current?.focus()}
    />
  )
}

export function ForgeTerminalPanel() {
  const { t } = useTranslation()
  const ws = useLunaWorkspace()
  const forge = useForgeLayout()
  const [sessions, setSessions] = useState<TerminalSession[]>(() => [
    { localId: nextLocalId(), ptyId: null, title: defaultTitle(1) },
  ])
  const [activeId, setActiveId] = useState(() => sessions[0]!.localId)

  const onPtyId = useCallback((localId: string, ptyId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.localId === localId ? { ...s, ptyId } : s)),
    )
  }, [])

  const onTitle = useCallback((localId: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.localId === localId ? { ...s, title } : s)),
    )
  }, [])

  const addSession = () => {
    const localId = nextLocalId()
    setSessions((prev) => [
      ...prev,
      { localId, ptyId: null, title: defaultTitle(prev.length + 1) },
    ])
    setActiveId(localId)
  }

  const closeSession = (localId: string) => {
    setSessions((prev) => {
      const target = prev.find((s) => s.localId === localId)
      if (target?.ptyId) void forgeTerminalKill(target.ptyId)
      const next = prev.filter((s) => s.localId !== localId)
      if (!next.length) {
        const fresh = { localId: nextLocalId(), ptyId: null, title: defaultTitle(1) }
        setActiveId(fresh.localId)
        return [fresh]
      }
      if (activeId === localId) {
        setActiveId(next[next.length - 1]!.localId)
      }
      return next
    })
  }

  const ptyAvailable = isForgeTerminalAvailable()

  useEffect(() => {
    if (forge.bottomTab !== 'terminal' || !ptyAvailable) return
    const timer = window.setTimeout(() => {
      document.querySelector<HTMLElement>('.luna-terminal-host .xterm-helper-textarea')?.focus()
    }, 50)
    return () => window.clearTimeout(timer)
  }, [forge.bottomTab, activeId, ptyAvailable])

  return (
    <div className="flex h-full min-h-0 flex-col bg-composer-well">
      <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-line-subtle/60 px-1 py-0.5">
        {sessions.map((s) => {
          const active = s.localId === activeId
          return (
            <div
              key={s.localId}
              className={`group flex max-w-[140px] shrink-0 items-center gap-0.5 rounded px-2 py-0.5 text-[10px] ${
                active ? 'bg-white/[0.08] text-fg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              <button
                type="button"
                className="min-w-0 truncate"
                onClick={() => setActiveId(s.localId)}
              >
                {s.title}
              </button>
              {sessions.length > 1 ? (
                <button
                  type="button"
                  tabIndex={-1}
                  className="rounded px-0.5 opacity-0 group-hover:opacity-70 hover:opacity-100"
                  aria-label={t('forge.terminal.closeTab')}
                  onClick={() => closeSession(s.localId)}
                >
                  ×
                </button>
              ) : null}
            </div>
          )
        })}
        <button
          type="button"
          className="luna-btn-ghost shrink-0 rounded px-1.5 py-0.5 text-[12px] text-fg-muted"
          title={t('forge.terminal.newTab')}
          onClick={addSession}
        >
          +
        </button>
      </div>

      {!ptyAvailable ? (
        <p className="px-3 py-4 text-[11px] text-fg-muted">
          {t('forge.terminal.electronOnly')}
        </p>
      ) : (
        <div className="relative min-h-0 flex-1">
          {sessions.map((s) => (
            <div
              key={s.localId}
              className={`absolute inset-0 flex flex-col ${
                s.localId === activeId
                  ? 'visible opacity-100'
                  : 'invisible pointer-events-none opacity-0'
              }`}
            >
              <InteractiveTerminal
                session={s}
                cwd={ws.workspaceRoot}
                visible={s.localId === activeId}
                onPtyId={onPtyId}
                onTitle={onTitle}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
