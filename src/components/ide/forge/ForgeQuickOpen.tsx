import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForgeLayout } from '../../../context/ForgeLayoutContext'
import { useLunaWorkspace } from '../../../context/LunaWorkspaceContext'
import { bridgeAgentGlob } from '../../../lib/lunaBridge'

function basename(p: string): string {
  return p.replace(/\\/g, '/').split('/').pop() ?? p
}

function scoreMatch(path: string, query: string): number {
  const name = basename(path).toLowerCase()
  const q = query.toLowerCase()
  if (name === q) return 100
  if (name.startsWith(q)) return 80
  if (name.includes(q)) return 60
  if (path.toLowerCase().includes(q)) return 40
  return 0
}

export function ForgeQuickOpen() {
  const { t } = useTranslation()
  const forge = useForgeLayout()
  const ws = useLunaWorkspace()
  const [query, setQuery] = useState('')
  const [paths, setPaths] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const roots = ws.workspaceFolders.length
      ? ws.workspaceFolders
      : ws.workspaceRoot
        ? [ws.workspaceRoot]
        : []
    if (!forge.quickOpen || !roots.length) return
    setQuery('')
    setIndex(0)
    setLoading(true)
    void (async () => {
      const merged: string[] = []
      for (const root of roots) {
        const r = await bridgeAgentGlob('**/*', root)
        if (!r.ok) continue
        const raw = (r as { paths?: unknown[] }).paths
        if (!Array.isArray(raw)) continue
        for (const item of raw) {
          const p =
            typeof item === 'string' ? item : (item as { path?: string }).path
          if (typeof p === 'string' && p.length > 0) merged.push(p)
        }
      }
      const list = [...new Set(merged)].filter((p) => {
        const lower = p.toLowerCase()
        return (
          !lower.includes('node_modules') &&
          !lower.includes('.git/') &&
          !lower.endsWith('.map')
        )
      })
      setPaths(list)
      setLoading(false)
    })()
  }, [forge.quickOpen, ws.workspaceFolders, ws.workspaceRoot])

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return paths.slice(0, 50)
    return paths
      .map((p) => ({ p, s: scoreMatch(p, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 40)
      .map((x) => x.p)
  }, [paths, query])

  const openPath = useCallback(
    async (path: string) => {
      forge.setQuickOpen(false)
      await ws.openFile(path)
    },
    [forge, ws],
  )

  const openSelected = useCallback(async () => {
    const path = filtered[index]
    if (!path) return
    await openPath(path)
  }, [filtered, index, openPath])

  useEffect(() => {
    if (!forge.quickOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        forge.setQuickOpen(false)
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIndex((i) => Math.min(i + 1, filtered.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setIndex((i) => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        void openSelected()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [forge, filtered.length, openSelected])

  if (!forge.quickOpen) return null

  return (
    <div
      className="absolute inset-0 z-50 flex items-start justify-center bg-canvas/60 pt-[12vh] backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={t('forge.quickOpen.title')}
      onClick={() => forge.setQuickOpen(false)}
    >
      <div
        className="luna-surface-panel w-full max-w-lg overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIndex(0)
          }}
          placeholder={t('forge.quickOpen.placeholder')}
          className="w-full border-b border-line bg-transparent px-4 py-3 text-[13px] text-fg outline-none"
        />
        <ul className="max-h-72 overflow-y-auto py-1">
          {loading ? (
            <li className="px-4 py-3 text-[11px] text-fg-muted">{t('forge.quickOpen.loading')}</li>
          ) : filtered.length === 0 ? (
            <li className="px-4 py-3 text-[11px] text-fg-muted">{t('forge.quickOpen.empty')}</li>
          ) : (
            filtered.map((p, i) => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => void openPath(p)}
                  onMouseEnter={() => setIndex(i)}
                  className={`flex w-full flex-col px-4 py-2 text-left text-[11px] ${
                    i === index ? 'bg-accent/15 text-fg' : 'text-fg-dim hover:bg-surface'
                  }`}
                >
                  <span className="font-medium">{basename(p)}</span>
                  <span className="truncate text-[10px] text-fg-muted">{p}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
