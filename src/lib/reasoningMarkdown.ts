import { enrichMemoryNoteMentionsInMarkdown } from './memoryNoteMentions'
import { TOOL_META } from '../agent/toolSchemas'

const TOOL_IDS = Object.keys(TOOL_META).sort((a, b) => b.length - a.length)

/** Envolve nomes de ferramentas nuas em `backticks` para renderizar como badge. */
export function enrichToolMentionsInMarkdown(text: string): string {
  let out = text
  for (const tool of TOOL_IDS) {
    const re = new RegExp(
      `(?<![\`\\w])(${tool.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\w\`])`,
      'g',
    )
    out = out.replace(re, '`$1`')
  }
  return out
}

/** Badges de ferramentas + notas de memória no bloco de pensamento. */
export function enrichReasoningDisplayMarkdown(text: string): string {
  return enrichToolMentionsInMarkdown(enrichMemoryNoteMentionsInMarkdown(text))
}
