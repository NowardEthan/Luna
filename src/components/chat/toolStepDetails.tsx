import type { AgentStepRecord } from '../../types/chat'
import { fileBasename } from '../../lib/pathUtils'

export function WebSearchDetail({
  detail,
}: {
  detail: Extract<NonNullable<AgentStepRecord['detail']>, { kind: 'web_search' }>
}) {
  return (
    <div className="space-y-2">
      {detail.query ? (
        <p className="text-[11px] text-fg-muted">
          Consulta: <span className="text-fg-dim">«{detail.query}»</span>
        </p>
      ) : null}
      {detail.answer ? (
        <p className="rounded-lg luna-surface-panel border border-line px-2.5 py-2 text-[12px] leading-relaxed text-fg-dim">
          {detail.answer}
        </p>
      ) : null}
      {detail.results.length > 0 ? (
        <ul className="space-y-2">
          {detail.results.map((r, i) => (
            <li
              key={`${r.url ?? r.hostname ?? i}`}
              className="rounded-lg luna-surface-panel border border-line px-2.5 py-2"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {r.hostname ? (
                  <span className="rounded-md bg-raised px-1.5 py-px text-[10px] font-medium text-accent">
                    {r.hostname}
                  </span>
                ) : null}
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] font-medium text-fg underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
                  >
                    {r.title?.trim() || r.url}
                  </a>
                ) : (
                  <span className="text-[12px] font-medium text-fg">
                    {r.title ?? 'Fonte'}
                  </span>
                )}
              </div>
              {r.snippet ? (
                <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
                  {r.snippet}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function DocumentsDetail({
  detail,
}: {
  detail: Extract<
    NonNullable<AgentStepRecord['detail']>,
    { kind: 'search_documents' }
  >
}) {
  if (!detail.citations.length) return null
  return (
    <ul className="space-y-1">
      {detail.citations.map((c, i) => (
        <li
          key={`${c.path}-${i}`}
          className="rounded-md luna-surface-panel border border-line px-2 py-1.5"
          title={c.path}
        >
          <span className="text-[11px] font-medium text-fg">
            {fileBasename(c.path)}
          </span>
          {c.preview ? (
            <p className="mt-0.5 line-clamp-3 text-[10px] leading-snug text-fg-muted">
              {c.preview}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function PathList({ paths, title }: { paths: string[]; title?: string }) {
  if (!paths.length) {
    return (
      <p className="text-[11px] text-fg-muted">Nenhum resultado encontrado.</p>
    )
  }
  return (
    <div className="space-y-1">
      {title ? (
        <p className="text-[10px] font-medium uppercase tracking-wide text-fg-muted">
          {title}
        </p>
      ) : null}
      <ul className="max-h-40 space-y-0.5 overflow-y-auto">
        {paths.map((p) => (
          <li
            key={p}
            className="truncate font-mono text-[10px] text-fg-dim"
            title={p}
          >
            {p}
          </li>
        ))}
      </ul>
    </div>
  )
}

function GrepMatchesDetail({
  matches,
}: {
  matches: { path: string; line: number; text: string }[]
}) {
  if (!matches.length) {
    return <p className="text-[11px] text-fg-muted">Sem correspondências.</p>
  }
  return (
    <ul className="max-h-48 space-y-1.5 overflow-y-auto">
      {matches.map((m, i) => (
        <li
          key={`${m.path}-${m.line}-${i}`}
          className="rounded-md luna-surface-panel border border-line px-2 py-1.5"
        >
          <p className="font-mono text-[10px] text-accent">
            {fileBasename(m.path)}
            {m.line > 0 ? `:${m.line}` : ''}
          </p>
          <p className="mt-0.5 line-clamp-2 font-mono text-[10px] text-fg-muted">
            {m.text}
          </p>
        </li>
      ))}
    </ul>
  )
}

function TerminalDetail({
  detail,
}: {
  detail: Extract<NonNullable<AgentStepRecord['detail']>, { kind: 'terminal' }>
}) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[11px] text-fg-dim">{detail.command}</p>
      {detail.gui ? (
        <p className="text-[10px] text-fg-muted">Modo: janela gráfica (GUI)</p>
      ) : null}
      {detail.exitCode != null ? (
        <p className="text-[11px] text-fg-muted">
          Código de saída:{' '}
          <span
            className={
              detail.exitCode === 0 ? 'text-emerald-400' : 'text-red-300'
            }
          >
            {detail.exitCode}
          </span>
        </p>
      ) : null}
      {detail.stdoutPreview ? (
        <pre className="max-h-32 overflow-auto rounded-md luna-surface-panel border border-line p-2 font-mono text-[10px] leading-relaxed text-fg-dim whitespace-pre-wrap">
          {detail.stdoutPreview}
        </pre>
      ) : null}
      {detail.stderrPreview ? (
        <pre className="max-h-24 overflow-auto rounded-md border border-red-500/20 bg-red-500/5 p-2 font-mono text-[10px] leading-relaxed text-red-200/90 whitespace-pre-wrap">
          {detail.stderrPreview}
        </pre>
      ) : null}
    </div>
  )
}

function EditDetail({
  detail,
}: {
  detail: Extract<NonNullable<AgentStepRecord['detail']>, { kind: 'edit' }>
}) {
  return (
    <div className="space-y-1.5">
      <p className="truncate font-mono text-[11px] text-fg-dim" title={detail.path}>
        {detail.path}
      </p>
      {detail.summary ? (
        <p className="text-[11px] text-fg-muted">{detail.summary}</p>
      ) : null}
      <p className="text-[10px] text-fg-muted">
        {detail.action === 'write_file' ? 'Escrita' : 'Patch'}
        {detail.lineCount != null ? ` · ${detail.lineCount} linhas` : ''}
        {' · '}
        {detail.status === 'pending'
          ? 'aguarda aceitação no editor'
          : detail.status === 'applied'
            ? 'aplicado'
            : 'falhou'}
      </p>
    </div>
  )
}

export function ToolStepDetailBody({ step }: { step: AgentStepRecord }) {
  const d = step.detail
  if (!d) {
    return (
      <p className="text-[11px] leading-relaxed text-fg-muted">{step.summary}</p>
    )
  }
  switch (d.kind) {
    case 'web_search':
      return <WebSearchDetail detail={d} />
    case 'search_documents':
      return (
        <>
          {d.query ? (
            <p className="mb-1.5 text-[11px] text-fg-muted">
              Consulta: «{d.query}»
            </p>
          ) : null}
          <DocumentsDetail detail={d} />
        </>
      )
    case 'search_past_conversations':
      return d.query ? (
        <p className="text-[11px] text-fg-muted">«{d.query}»</p>
      ) : null
    case 'describe_images':
      return (
        <p className="text-[11px] text-fg-muted">
          {d.imageCount} imagem(ns)
          {d.focus ? ` · foco: ${d.focus}` : ''}
        </p>
      )
    case 'save_memory':
      return d.preview ? (
        <p className="text-[11px] text-fg-dim">{d.preview}</p>
      ) : null
    case 'filesystem':
      return (
        <div className="space-y-1.5">
          <p className="truncate font-mono text-[11px] text-fg-dim" title={d.path}>
            {d.path}
          </p>
          {d.action === 'list_directory' ? (
            <>
              {d.entryCount != null ? (
                <p className="text-[11px] text-fg-muted">
                  {d.entryCount} entrada(s) listada(s)
                </p>
              ) : null}
              {d.sampleEntries?.length ? (
                <p className="text-[10px] leading-relaxed text-fg-muted">
                  {d.sampleEntries.join(', ')}
                  {(d.entryCount ?? 0) > d.sampleEntries.length ? '…' : ''}
                </p>
              ) : null}
            </>
          ) : d.entryCount != null ? (
            <p className="text-[11px] text-fg-muted">{d.entryCount} linhas lidas</p>
          ) : null}
          {d.error ? (
            <p className="text-[11px] text-red-300/90">{d.error}</p>
          ) : null}
        </div>
      )
    case 'glob':
      return (
        <div className="space-y-1.5">
          <p className="text-[11px] text-fg-muted">
            Padrão: <span className="font-mono text-fg-dim">«{d.pattern}»</span>
            {d.truncated ? ' (lista truncada)' : ''}
          </p>
          <PathList paths={d.paths} title={`${d.matchCount} resultado(s)`} />
        </div>
      )
    case 'grep':
      return (
        <div className="space-y-1.5">
          <p className="text-[11px] text-fg-muted">
            Expressão: <span className="font-mono text-fg-dim">«{d.pattern}»</span>
            {d.truncated ? ' (truncado)' : ''}
            {' · '}
            {d.matchCount} ocorrência(s)
          </p>
          <GrepMatchesDetail matches={d.matches} />
        </div>
      )
    case 'terminal':
      return <TerminalDetail detail={d} />
    case 'edit':
      return <EditDetail detail={d} />
    case 'git':
      return (
        <div className="space-y-1">
          <p className="text-[11px] text-fg-muted">{d.summary}</p>
          {d.preview ? (
            <pre className="max-h-36 overflow-auto rounded-md luna-surface-panel border border-line p-2 font-mono text-[10px] leading-relaxed text-fg-dim whitespace-pre-wrap">
              {d.preview}
            </pre>
          ) : null}
        </div>
      )
    default:
      return (
        <div className="space-y-1">
          <p className="text-[11px] text-fg-muted">{d.message}</p>
          {d.error ? (
            <p className="text-[11px] text-red-300/90">{d.error}</p>
          ) : null}
        </div>
      )
  }
}

/** Subtítulo curto para a linha da timeline. */
export function toolStepSubtitle(step: AgentStepRecord): string | undefined {
  if (step.attempt && step.attempt > 1) {
    const round =
      step.orchestratorRound && step.orchestratorRound > 0
        ? ` · passo ${step.orchestratorRound}`
        : ''
    return `Tentativa ${step.attempt}${round}`
  }

  const d = step.detail
  if (d) {
    switch (d.kind) {
      case 'glob':
        return `«${truncate(d.pattern, 32)}» · ${d.matchCount} ficheiro(s)`
      case 'grep':
        return `«${truncate(d.pattern, 28)}» · ${d.matchCount} hit(s)`
      case 'terminal':
        return truncate(d.command, 44)
      case 'edit':
        return `${fileBasename(d.path)}${d.status === 'pending' ? ' · pendente' : ''}`
      case 'filesystem':
        if (d.action === 'list_directory') {
          return d.entryCount != null
            ? `${d.entryCount} itens · ${fileBasename(d.path) || d.path}`
            : fileBasename(d.path) || d.path
        }
        return fileBasename(d.path) || d.path
      case 'search_documents':
      case 'web_search':
        return d.query ? truncate(d.query, 48) : undefined
      case 'git':
        return truncate(d.summary, 48)
      case 'generic':
        return d.error ? truncate(d.error, 48) : truncate(d.message, 48)
      default:
        break
    }
  }

  if (step.orchestratorRound && step.orchestratorRound > 0) {
    return `Passo ${step.orchestratorRound}`
  }
  return undefined
}

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}
