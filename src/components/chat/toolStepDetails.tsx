import i18n from '../../i18n'
import type { AgentStepRecord } from '../../types/chat'
import { fileBasename } from '../../lib/pathUtils'

const t = i18n.t.bind(i18n)

export function WebSearchDetail({
  detail,
}: {
  detail: Extract<NonNullable<AgentStepRecord['detail']>, { kind: 'web_search' }>
}) {
  return (
    <div className="space-y-2">
      {detail.query ? (
        <p className="text-[11px] text-fg-muted">
          {t('chatTurn.web_query')}{' '}
          <span className="text-fg-dim">«{detail.query}»</span>
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
                  <span className="luna-chip !rounded-md !px-1.5 !py-px text-[10px] text-accent">
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
                    {r.title ?? t('chatTurn.source')}
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
      <p className="text-[11px] text-fg-muted">{t('chatTurn.no_results')}</p>
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
    return <p className="text-[11px] text-fg-muted">{t('chatTurn.no_matches')}</p>
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
        <p className="text-[10px] text-fg-muted">{t('chatTurn.terminal_gui')}</p>
      ) : null}
      {detail.exitCode != null ? (
        <p className="text-[11px] text-fg-muted">
          {t('chatTurn.exit_code', { code: detail.exitCode })}
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
        {detail.action === 'write_file' ? t('toolStep.write') : t('toolStep.patch')}
        {detail.lineCount != null
          ? `${t('toolStep.lines')}${detail.lineCount}`
          : ''}
        {' · '}
        {detail.status === 'pending'
          ? t('toolStep.pending')
          : detail.status === 'applied'
            ? t('toolStep.applied')
            : t('toolStep.failed')}
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
              {t('toolStep.query')} «{d.query}»
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
          {t('toolStep.image_count', { count: d.imageCount })}
          {d.focus ? t('toolStep.focus', { focus: d.focus }) : ''}
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
                  {t('toolStep.entries_listed', { count: d.entryCount })}
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
            <p className="text-[11px] text-fg-muted">
              {t('toolStep.lines_read', { count: d.entryCount })}
            </p>
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
            {t('toolStep.pattern')}{' '}
            <span className="font-mono text-fg-dim">«{d.pattern}»</span>
            {d.truncated ? t('toolStep.truncated_list') : ''}
          </p>
          <PathList
            paths={d.paths}
            title={t('toolStep.results', { count: d.matchCount })}
          />
        </div>
      )
    case 'grep':
      return (
        <div className="space-y-1.5">
          <p className="text-[11px] text-fg-muted">
            {t('toolStep.expression')}{' '}
            <span className="font-mono text-fg-dim">«{d.pattern}»</span>
            {d.truncated ? t('toolStep.truncated') : ''}
            {' · '}
            {t('toolStep.occurrences', { count: d.matchCount })}
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
        ? t('toolStep.round', { round: step.orchestratorRound })
        : ''
    return t('toolStep.attempt', { attempt: step.attempt, round })
  }

  const d = step.detail
  if (d) {
    switch (d.kind) {
      case 'glob':
        return t('toolStep.files_match', {
          pattern: truncate(d.pattern, 32),
          count: d.matchCount,
        })
      case 'grep':
        return t('toolStep.grep_match', {
          pattern: truncate(d.pattern, 28),
          count: d.matchCount,
        })
      case 'terminal':
        return truncate(d.command, 44)
      case 'edit':
        return `${fileBasename(d.path)}${
          d.status === 'pending' ? t('toolStep.pending_suffix') : ''
        }`
      case 'filesystem':
        if (d.action === 'list_directory') {
          return d.entryCount != null
            ? t('toolStep.items', {
                count: d.entryCount,
                path: fileBasename(d.path) || d.path,
              })
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
    return t('toolStep.step', { round: step.orchestratorRound })
  }
  return undefined
}

function truncate(s: string, max: number): string {
  const trimmed = s.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}
