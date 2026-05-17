import { useCallback, useEffect, useState } from 'react'
import {
  ragClear,
  ragIndexFiles,
  ragIndexFolder,
  ragPickFiles,
  ragPickFolder,
  ragStatus,
  type RagStatus,
} from '../lib/ragClient'
import { fileBasename } from '../lib/pathUtils'
import { useLunaWorkspaceOptional } from '../context/LunaWorkspaceContext'

type Props = {
  ragEnabled: boolean
  onRagEnabledChange: (value: boolean) => void
}

function folderHint(path: string, maxLen = 28): string {
  const base = fileBasename(path)
  const tail = base.length > maxLen ? `${base.slice(0, maxLen)}…` : base
  return tail
}

export function RagControls({ ragEnabled, onRagEnabledChange }: Props) {
  const workspace = useLunaWorkspaceOptional()
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState<RagStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const s = await ragStatus()
    setStatus(s)
  }, [])

  useEffect(() => {
    if (expanded) void refresh()
  }, [expanded, refresh])

  async function handlePickAndIndex() {
    setBusy(true)
    setError(null)
    try {
      const pick = await ragPickFolder()
      if (pick.canceled || !pick.path) return
      const res = await ragIndexFolder(pick.path)
      if (!res.ok) {
        setError(
          res.error ||
            'Não foi possível indexar esta pasta. Confira permissões, formatos e TOGETHER_API_KEY ou GROQ_API_KEY no .env.',
        )
        return
      }
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handlePickFilesAndIndex() {
    setBusy(true)
    setError(null)
    try {
      const pick = await ragPickFiles()
      if (pick.canceled || pick.paths.length === 0) return
      const res = await ragIndexFiles(pick.paths)
      if (!res.ok) {
        setError(
          res.error ||
            'Não foi possível indexar os arquivos. Confira TOGETHER_API_KEY ou GROQ_API_KEY no .env e os formatos suportados.',
        )
        return
      }
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleIndexWorkspace() {
    const root = workspace?.workspaceRoot
    if (!root) return
    setBusy(true)
    setError(null)
    try {
      const res = await ragIndexFolder(root)
      if (!res.ok) {
        setError(res.error || 'Não foi possível indexar o workspace.')
        return
      }
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleClearIndex() {
    setBusy(true)
    setError(null)
    try {
      const res = await ragClear()
      if (!res.ok) {
        setError('Não foi possível apagar os documentos salvos.')
        return
      }
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const statusLine = (() => {
    if (!status) return 'Carregando estado…'
    if (!status.ok) return 'Não foi possível ler os documentos salvos.'
    if (status.chunkCount === 0) return 'Nenhum documento adicionado ainda'
    const n = status.chunkCount
    const trecho = n === 1 ? 'trecho' : 'trechos'
    if (status.indexedFolder) {
      return `${n} ${trecho} de “${folderHint(status.indexedFolder)}”`
    }
    return `${n} ${trecho} dos seus arquivos`
  })()

  const toggleLabel = ragEnabled
    ? 'Meus documentos — ativado'
    : 'Meus documentos — desativado'

  return (
    <div className="shrink-0 border-b border-line bg-sidebar/30">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset"
        aria-expanded={expanded}
      >
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-fg-dim">
          {toggleLabel}
        </span>
        <span
          className={`shrink-0 text-fg-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-line/80 px-3 pb-3 pt-2">
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            <p className="text-[11px] leading-relaxed text-fg-muted">
              {statusLine}. Os trechos ficam salvos neste computador; embeddings usam Together ou Groq (fallback) —
              chaves <code className="rounded bg-raised px-0.5 text-[10px]">TOGETHER_API_KEY</code> /{' '}
              <code className="rounded bg-raised px-0.5 text-[10px]">GROQ_API_KEY</code> no{' '}
              <code className="rounded bg-raised px-0.5 text-[10px]">.env</code>). Formatos de texto/código: .md, .txt,
              .ts, .js, .html, .json, .csv e outros — não inclui PDF.
            </p>

            <label className="flex cursor-pointer items-start gap-2.5 text-[12px] text-fg">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 rounded border-line bg-canvas accent-accent"
                checked={ragEnabled}
                disabled={busy}
                onChange={(e) => onRagEnabledChange(e.target.checked)}
              />
              <span>
                Usar meus arquivos para enriquecer as respostas quando fizer sentido
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handlePickAndIndex()}
                className="rounded-lg border border-line bg-raised px-3 py-1.5 text-[12px] font-medium text-fg transition-colors hover:bg-raised-hover disabled:opacity-40"
              >
                Adicionar pasta…
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handlePickFilesAndIndex()}
                className="rounded-lg border border-line bg-raised px-3 py-1.5 text-[12px] font-medium text-fg transition-colors hover:bg-raised-hover disabled:opacity-40"
              >
                Adicionar arquivos…
              </button>
              {workspace?.workspaceRoot ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleIndexWorkspace()}
                  className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-[12px] font-medium text-accent transition-colors hover:bg-accent/15 disabled:opacity-40"
                >
                  Indexar workspace
                </button>
              ) : null}
              <button
                type="button"
                disabled={busy || (status?.ok && status.chunkCount === 0)}
                onClick={() => void handleClearIndex()}
                className="rounded-lg px-3 py-1.5 text-[12px] text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-fg disabled:opacity-40"
              >
                Apagar documentos salvos
              </button>
            </div>

            {error ? (
              <p className="text-[11px] leading-snug text-red-400/90">{error}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
