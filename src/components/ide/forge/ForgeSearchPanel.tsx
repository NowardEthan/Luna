import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForgeLayout } from '../../../context/ForgeLayoutContext'
import { useLunaWorkspace } from '../../../context/LunaWorkspaceContext'
import { bridgeAgentGrep, bridgeAgentReadFile, bridgeAgentWriteFile } from '../../../lib/lunaBridge'
import { escapeRegexLiteral, normalizeGrepResponse, type GrepMatch } from '../../../lib/forgeGrep'

function basename(p: string): string {
  return p.replace(/\\/g, '/').split('/').pop() ?? p
}

export function ForgeSearchPanel() {
  const { t } = useTranslation()
  const forge = useForgeLayout()
  const ws = useLunaWorkspace()
  const [query, setQuery] = useState('')
  const [replace, setReplace] = useState('')
  const [useRegex, setUseRegex] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [matches, setMatches] = useState<GrepMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)

  const runSearch = useCallback(async () => {
    const q = query.trim()
    const roots = ws.workspaceFolders.length
      ? ws.workspaceFolders
      : ws.workspaceRoot
        ? [ws.workspaceRoot]
        : []
    if (!q || !roots.length) {
      setMatches([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const pattern = useRegex ? q : escapeRegexLiteral(q)
    const merged: GrepMatch[] = []
    let anyTruncated = false
    let firstError: string | null = null
    for (const root of roots) {
      const raw = await bridgeAgentGrep(pattern, root, caseSensitive)
      const result = normalizeGrepResponse(raw)
      if (!result.ok) {
        firstError ??= result.error ?? t('forge.search.failed')
        continue
      }
      merged.push(...result.matches)
      if (result.truncated) anyTruncated = true
    }
    merged.sort((a, b) =>
      a.path === b.path ? a.line - b.line : a.path.localeCompare(b.path),
    )
    setLoading(false)
    if (!merged.length && firstError) {
      setError(firstError)
      setMatches([])
      return
    }
    setError(null)
    setMatches(merged)
    setTruncated(anyTruncated)
  }, [query, ws.workspaceFolders, ws.workspaceRoot, useRegex, caseSensitive, t])

  useEffect(() => {
    const id = window.setTimeout(() => void runSearch(), 320)
    return () => window.clearTimeout(id)
  }, [runSearch])

  const openMatch = async (m: GrepMatch) => {
    const ok = await ws.openFile(m.path)
    if (ok) forge.setRevealLine({ path: m.path, line: m.line })
  }

  const replaceInFile = async (m: GrepMatch) => {
    if (!query.trim()) return
    const r = await bridgeAgentReadFile(m.path)
    if (!r.ok || r.content === undefined) return
    const pattern = useRegex ? new RegExp(query, caseSensitive ? '' : 'i') : new RegExp(escapeRegexLiteral(query), caseSensitive ? '' : 'i')
    const lines = r.content.split(/\r?\n/)
    const idx = m.line - 1
    if (idx < 0 || idx >= lines.length) return
    lines[idx] = lines[idx]!.replace(pattern, replace)
    await bridgeAgentWriteFile(m.path, lines.join('\n'))
    void runSearch()
    if (ws.activeFilePath === m.path) await ws.openFile(m.path)
  }

  const replaceAll = async () => {
    const byFile = new Map<string, GrepMatch[]>()
    for (const m of matches) {
      const list = byFile.get(m.path) ?? []
      list.push(m)
      byFile.set(m.path, list)
    }
    const pattern = useRegex ? new RegExp(query, caseSensitive ? 'g' : 'gi') : new RegExp(escapeRegexLiteral(query), caseSensitive ? 'g' : 'gi')
    for (const [path] of byFile) {
      const r = await bridgeAgentReadFile(path)
      if (!r.ok || r.content === undefined) continue
      const next = r.content.replace(pattern, replace)
      await bridgeAgentWriteFile(path, next)
    }
    void runSearch()
    if (ws.activeFilePath) await ws.openFile(ws.activeFilePath)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-2 border-b border-line-subtle px-3 py-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('forge.search.placeholder')}
          className="luna-field w-full py-1.5 text-[12px]"
          aria-label={t('forge.search.placeholder')}
        />
        <input
          type="text"
          value={replace}
          onChange={(e) => setReplace(e.target.value)}
          placeholder={t('forge.search.replacePlaceholder')}
          className="luna-field w-full py-1.5 text-[12px]"
          aria-label={t('forge.search.replacePlaceholder')}
        />
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-fg-muted">
          <label className="flex cursor-pointer items-center gap-1">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="size-3 rounded accent-accent"
            />
            {t('forge.search.caseSensitive')}
          </label>
          <label className="flex cursor-pointer items-center gap-1">
            <input
              type="checkbox"
              checked={useRegex}
              onChange={(e) => setUseRegex(e.target.checked)}
              className="size-3 rounded accent-accent"
            />
            {t('forge.search.regex')}
          </label>
          {matches.length > 0 && replace ? (
            <button
              type="button"
              onClick={() => void replaceAll()}
              className="luna-btn-ghost px-1.5 py-0.5 text-accent"
            >
              {t('forge.search.replaceAll', { count: matches.length })}
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {loading ? (
          <p className="px-3 py-2 text-[11px] text-fg-muted">{t('forge.search.searching')}</p>
        ) : error ? (
          <p className="px-3 py-2 text-[11px] text-danger">{error}</p>
        ) : matches.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-fg-muted">
            {query.trim() ? t('forge.search.noResults') : t('forge.search.typeToSearch')}
          </p>
        ) : (
          <ul>
            {truncated ? (
              <li className="px-3 py-1 text-[10px] text-warning">{t('forge.search.truncated')}</li>
            ) : null}
            {matches.map((m, i) => (
              <li key={`${m.path}:${m.line}:${i}`} className="group">
                <button
                  type="button"
                  onClick={() => void openMatch(m)}
                  className="luna-hover-row flex w-full flex-col px-3 py-1.5 text-left"
                >
                  <span className="flex items-center gap-2 text-[11px]">
                    <span className="font-medium text-fg">{basename(m.path)}</span>
                    <span className="text-fg-muted">:{m.line}</span>
                    {replace ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          void replaceInFile(m)
                        }}
                        className="ml-auto hidden text-[10px] text-accent group-hover:inline"
                      >
                        {t('forge.search.replaceOne')}
                      </button>
                    ) : null}
                  </span>
                  <span className="truncate text-[10px] text-fg-muted">{m.text.trim()}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
