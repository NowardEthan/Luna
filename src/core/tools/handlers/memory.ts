import { applyConfigureMemories } from '../../../lib/configureMemoriesTool'
import { MEMORY_AGENT_TOOLS } from '../../../lib/lunaMemoryTools'
import {
  applySaveMemoryToolCalls,
  sanitizeSaveMemoryToolCalls,
} from '../../../lib/saveMemoryTool'
import type { RegisteredTool } from '../../registry/types'
import { finishTool } from '../toolResult'

type SchemaShape = { function: { name: string } }

const memoryUi: Record<string, { label: string; badgeClass: string }> = {
  save_memory: { label: 'Memória', badgeClass: 'bg-violet-500/20 text-violet-200' },
  configure_memories: {
    label: 'Painel memórias',
    badgeClass: 'bg-violet-500/15 text-violet-300/90',
  },
}

function handlerFor(name: string): RegisteredTool['handler'] {
  if (name === 'save_memory') {
    return async ({ call, args, ctx, effects }) => {
      const toolCalls = sanitizeSaveMemoryToolCalls([call])
      const applied = applySaveMemoryToolCalls(
        ctx.getMemoryNotes() ?? [],
        toolCalls,
        ctx.assistantMsgId,
        ctx.nextId,
      )
      ctx.setMemoryNotes(applied.notes)
      const anyOk = applied.toolResponses.some((t) => {
        try {
          return (JSON.parse(t.content) as { ok?: boolean }).ok === true
        } catch {
          return false
        }
      })
      if (anyOk) effects.memorySaved = true
      const preview = applied.notes
        .filter((n) => n.sourceMessageId === ctx.assistantMsgId)
        .map((n) => n.title)
        .join(', ')
      return finishTool(
        name,
        anyOk,
        applied.toolResponses[0]?.content ?? '{"ok":false}',
        { ...args, _preview: preview },
        { ok: anyOk },
      )
    }
  }
  return async ({ call, args, ctx }) => {
    const applied = applyConfigureMemories(
      ctx.userMemory.memoryUi,
      call.function?.arguments ?? '{}',
    )
    ctx.setMemoryUi(applied.ui)
    const ok = (applied.toolPayload as { ok?: boolean }).ok === true
    return finishTool(
      name,
      ok,
      JSON.stringify(applied.toolPayload),
      args,
      { ok },
    )
  }
}

export const memoryTools: RegisteredTool[] = (
  MEMORY_AGENT_TOOLS as SchemaShape[]
).map((schema) => {
  const name = schema.function.name
  return {
    name,
    family: 'memory',
    schema,
    uiLabel: name === 'save_memory' ? 'Memória' : 'Memórias (painel)',
    uiMeta: memoryUi[name],
    handler: handlerFor(name),
  }
})
