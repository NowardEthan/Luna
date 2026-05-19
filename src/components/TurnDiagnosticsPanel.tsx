import { useEffect, useMemo, useState } from 'react'
import type { TurnDiagnostics } from '../types/chat'
import { fetchServerDiagnosticLogs } from '../lib/lunaDiagnostics'
import { copyWithToast } from '../lib/toast'

type Props = {
  diagnostics?: TurnDiagnostics
  errorText?: string
}

function parseBulletsFromError(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('•'))
}

export function TurnDiagnosticsPanel({ diagnostics, errorText }: Props) {
  const [serverLog, setServerLog] = useState(diagnostics?.serverLog ?? '')
  const [serverLogError, setServerLogError] = useState<string | null>(null)
  const [loadingLogs, setLoadingLogs] = useState(!diagnostics?.serverLog)

  const llmAttempts = useMemo(
    () =>
      diagnostics?.llmAttempts?.length
        ? diagnostics.llmAttempts
        : errorText
          ? parseBulletsFromError(errorText)
          : [],
    [diagnostics?.llmAttempts, errorText],
  )

  useEffect(() => {
    if (diagnostics?.serverLog) return
    let cancelled = false
    void (async () => {
      const r = await fetchServerDiagnosticLogs(150)
      if (cancelled) return
      if (r.ok) {
        setServerLog(r.text)
        setServerLogError(null)
      } else {
        setServerLogError(r.error)
      }
      setLoadingLogs(false)
    })()
    return () => {
      cancelled = true
    }
  }, [diagnostics?.serverLog])

  const copyPayload = useMemo(() => {
    const parts: string[] = []
    if (llmAttempts.length) {
      parts.push('=== Tentativas de modelo ===', ...llmAttempts)
    }
    if (serverLog.trim()) {
      parts.push('', '=== Registo do servidor ===', serverLog)
    }
    if (errorText?.trim()) {
      parts.push('', '=== Erro ===', errorText)
    }
    return parts.join('\n')
  }, [llmAttempts, serverLog, errorText])

  const hasLlm = llmAttempts.length > 0
  const hasServer = Boolean(serverLog.trim()) || Boolean(serverLogError)

  if (!hasLlm && !hasServer && !loadingLogs) return null

  return (
    <div className="mt-2 space-y-2">
      {copyPayload.trim() ? (
        <button
          type="button"
          className="text-ui text-accent hover:underline"
          onClick={() => void copyWithToast(copyPayload, 'Diagnóstico copiado')}
        >
          Copiar diagnóstico
        </button>
      ) : null}
      {hasLlm ? (
        <details className="group">
          <summary className="cursor-pointer select-none text-ui font-medium text-fg-muted">
            Tentativas de modelo ({llmAttempts.length})
          </summary>
          <ul className="mt-1.5 max-h-40 space-y-1 overflow-y-auto">
            {llmAttempts.map((line) => (
              <li
                key={line}
                className="rounded-md border border-line-subtle/80 bg-canvas/60 px-2 py-1 font-mono text-caption leading-snug text-fg-muted whitespace-pre-wrap"
              >
                {line}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <details className="group">
        <summary className="cursor-pointer select-none text-ui font-medium text-fg-muted">
          Registo do servidor (terminal)
          {loadingLogs ? ' — a carregar…' : ''}
        </summary>
        {serverLogError ? (
          <p className="mt-1.5 text-caption text-red-300/90">{serverLogError}</p>
        ) : null}
        {serverLog.trim() ? (
          <pre className="mt-1.5 max-h-48 overflow-auto rounded-md border border-line bg-canvas/90 p-2 font-mono text-caption leading-snug text-fg-muted whitespace-pre-wrap">
            {serverLog}
          </pre>
        ) : !loadingLogs && !serverLogError ? (
          <p className="mt-1.5 text-caption text-fg-muted">
            Sem entradas recentes. Confirma que `npm run server` está a correr.
          </p>
        ) : null}
      </details>
    </div>
  )
}
