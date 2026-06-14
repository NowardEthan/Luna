import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { MemoryNoteMentionBadge } from './chat/MemoryNoteMentionBadge'
import {
  ToolMentionBadge,
  toolIdFromInlineCode,
} from './chat/ToolMentionBadge'
import {
  memoryNoteIdFromInlineCode,
  memoryNoteTitleForId,
} from '../lib/memoryNoteMentions'
import type { MemoryNote } from '../types/memory'
import { MarkdownCodeBlock } from './chat/MarkdownCodeBlock'
import { normalizeAssistantMarkdown } from '../lib/normalizeAssistantMarkdown'

export type AssistantMarkdownVariant =
  | 'default'
  | 'compact'
  | 'reasoning'
  | 'reasoningCompact'

type Props = {
  content: string
  variant?: AssistantMarkdownVariant
  memoryNotes?: MemoryNote[]
  /** Turno actual — badges de ferramenta saltam para a timeline */
  messageId?: string
}

function inlineCodeText(children: ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) {
    return children.map((c) => (typeof c === 'string' ? c : '')).join('')
  }
  return String(children ?? '')
}

function buildMdComponents(
  variant: AssistantMarkdownVariant,
  memoryNotesById: Map<string, MemoryNote>,
  messageId?: string,
): Components {
  const reasoning =
    variant === 'reasoning' || variant === 'reasoningCompact'
  const compact =
    variant === 'compact' || variant === 'reasoningCompact' || reasoning

  const textSize = reasoning ? 'text-[12px]' : compact ? 'text-[13px]' : ''
  const headingScale = reasoning ? 'text-[13px]' : ''

  return {
    h1: ({ children }) => (
      <h1
        className={`mb-2 mt-3 border-b border-line-subtle pb-1.5 font-semibold leading-snug text-fg first:mt-0 ${
          reasoning ? 'text-[14px]' : 'text-[1.35rem] tracking-tight'
        }`}
      >
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2
        className={`mb-2 mt-3 font-semibold leading-snug text-fg first:mt-0 ${
          reasoning ? 'text-[13px]' : 'text-[1.2rem]'
        }`}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3
        className={`mb-1.5 mt-2.5 font-semibold leading-snug text-fg first:mt-0 ${
          reasoning ? 'text-[12px]' : 'text-[1.05rem]'
        }`}
      >
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4
        className={`mb-1.5 mt-2 font-semibold text-fg first:mt-0 ${
          reasoning ? 'text-[12px]' : 'text-[1rem]'
        } ${headingScale}`}
      >
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p
        className={`mb-2.5 last:mb-0 leading-relaxed text-fg-dim [&+p]:mt-0 ${textSize}`}
      >
        {children}
      </p>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-fg">{children}</strong>
    ),
    em: ({ children }) => <em className="italic text-fg-dim">{children}</em>,
    a: ({ href, children }) => (
      <a
        href={href}
        className="font-medium text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:decoration-accent"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    ul: ({ children }) => (
      <ul
        className={`mb-2.5 list-disc space-y-1 pl-4 leading-relaxed text-fg-dim marker:text-fg-muted last:mb-0 ${textSize}`}
      >
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol
        className={`mb-2.5 list-decimal space-y-1 pl-4 leading-relaxed text-fg-dim marker:text-fg-muted last:mb-0 ${textSize}`}
      >
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="pl-0.5 [&>p]:mb-0">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote
        className={`mb-2.5 border-l-2 border-accent/35 bg-white/[0.03] py-1.5 pl-3 pr-2 text-fg-muted italic last:mb-0 ${
          reasoning ? 'text-[11px]' : ''
        }`}
      >
        {children}
      </blockquote>
    ),
    hr: () => (
      <hr
        className={
          reasoning
            ? 'my-3 border-0 border-t border-line-subtle'
            : 'my-6 border-0 border-t border-line'
        }
      />
    ),
    table: ({ children }) => (
      <div className="mb-2.5 max-w-full overflow-x-auto rounded-lg border border-line-subtle last:mb-0">
        <table
          className={`w-full min-w-[14rem] border-collapse text-left ${textSize}`}
        >
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="border-b border-line-subtle bg-raised/60">{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-line-subtle">{children}</tbody>
    ),
    tr: ({ children }) => (
      <tr className="transition-colors hover:bg-white/[0.02]">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="px-2 py-1.5 text-[11px] font-semibold text-fg">{children}</th>
    ),
    td: ({ children }) => (
      <td className="px-2 py-1.5 text-fg-dim">{children}</td>
    ),
    pre: ({ children }) => <>{children}</>,
    code: ({ className, children, ...props }) => {
      const raw = inlineCodeText(children).replace(/\n$/, '')
      const isBlock =
        /\blanguage-/.test(className ?? '') ||
        (raw.includes('\n') && raw.length > 0)

      if (isBlock) {
        return (
          <MarkdownCodeBlock
            code={raw}
            className={className}
            compact={reasoning || compact}
          />
        )
      }

      const inlineRaw = inlineCodeText(children)
      const toolId = toolIdFromInlineCode(inlineRaw)
      if (toolId) {
        return (
          <ToolMentionBadge
            toolId={toolId}
            messageId={messageId}
            className="mx-0.5"
          />
        )
      }

      const noteId = memoryNoteIdFromInlineCode(inlineRaw)
      if (noteId) {
        return (
          <MemoryNoteMentionBadge
            noteId={noteId}
            title={memoryNoteTitleForId(noteId, memoryNotesById)}
            className="mx-0.5"
          />
        )
      }

      return (
        <code
          className={
            reasoning
              ? 'rounded-md bg-raised/90 px-1.5 py-px font-mono text-[0.88em] text-accent/95 ring-1 ring-line-subtle'
              : 'rounded-md bg-raised px-1.5 py-px font-mono text-[0.9em] text-accent'
          }
          {...props}
        >
          {children}
        </code>
      )
    },
    img: ({ src, alt }) => (
      <img
        src={src}
        alt={alt ?? ''}
        className="my-2 max-h-64 max-w-full rounded-lg border border-line-subtle object-contain"
        loading="lazy"
      />
    ),
    del: ({ children }) => (
      <del className="text-fg-muted line-through">{children}</del>
    ),
    input: ({ type, checked, ...props }) => {
      if (type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={Boolean(checked)}
            readOnly
            className="mr-2 align-middle accent-accent"
            aria-readonly
            {...props}
          />
        )
      }
      return <input type={type} {...props} />
    },
  }
}

const VARIANT_WRAP: Record<AssistantMarkdownVariant, string> = {
  default: 'assistant-markdown min-w-0',
  compact: 'assistant-markdown assistant-markdown--compact min-w-0 text-[13px]',
  reasoning:
    'assistant-markdown assistant-markdown--reasoning luna-surface-panel min-w-0 rounded-lg border border-line px-2.5 py-2',
  reasoningCompact:
    'assistant-markdown assistant-markdown--reasoning assistant-markdown--compact luna-surface-panel min-w-0 rounded-lg border border-line px-2 py-1.5 text-[12px]',
}

export function AssistantMarkdown({
  content,
  variant = 'default',
  memoryNotes,
  messageId,
}: Props) {
  if (!content.trim()) return null

  const normalized = normalizeAssistantMarkdown(content)

  const memoryNotesById = new Map(
    (memoryNotes ?? []).map((n) => [n.id, n] as const),
  )

  return (
    <div className={VARIANT_WRAP[variant]}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={buildMdComponents(variant, memoryNotesById, messageId)}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  )
}
