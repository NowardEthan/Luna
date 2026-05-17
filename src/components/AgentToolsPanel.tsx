import type { AgentStepRecord, Message } from '../types/chat'
import { ToolStepDetailBody } from './chat/toolStepDetails'

type Props = {
  steps?: AgentStepRecord[]
  inProgress?: boolean
  llmProvider?: Message['llmProvider']
  usedLlmFallback?: boolean
}

function StepIcon({ ok }: { ok: boolean }) {
  return (
    <span
      className={
        ok
          ? 'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] text-accent'
          : 'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-[10px] text-red-300'
      }
      aria-hidden
    >
      {ok ? '✓' : '!'}
    </span>
  )
}

/** @deprecated Usar timeline em AssistantTurn. Mantido para referência / testes. */
export function AgentToolsPanel({ steps, inProgress }: Props) {
  const list = steps ?? []
  if (!list.length && !inProgress) return null

  return (
    <section
      className="mt-4 max-w-2xl border-t border-line-subtle pt-3"
      aria-label="Atividade"
    >
      <ul className="space-y-3">
        {list.map((step, i) => (
          <li
            key={`${step.tool}-${i}`}
            className="rounded-xl border border-line bg-surface/80 px-3 py-2.5"
          >
            <div className="flex gap-2">
              <StepIcon ok={step.ok} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-fg">{step.label}</p>
                <ToolStepDetailBody step={step} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
