import type { TurnTimelineItem } from './turnTimeline'

/** Resumo curto para o cabeçalho do painel «Atividade». */
export function buildActivitySummary(items: TurnTimelineItem[]): string {
  let reasoning = 0
  let tools = 0

  let answer = 0

  for (const item of items) {
    if (item.kind === 'reasoning' || item.kind === 'reasoning_round') reasoning++
    else if (item.kind === 'tool') tools++
    else if (item.kind === 'answer') answer++
  }

  const parts: string[] = []
  if (reasoning === 1) parts.push('raciocínio')
  else if (reasoning > 1) parts.push(`${reasoning} raciocínios`)
  if (tools === 1) parts.push('ferramenta')
  else if (tools > 1) parts.push(`${tools} ferramentas`)
  if (answer > 0) parts.push(answerLiveLabel(answer, items))

  return parts.join(' · ') || 'processamento'
}

function answerLiveLabel(
  answer: number,
  items: TurnTimelineItem[],
): string {
  const row = items.find((i) => i.kind === 'answer')
  if (row?.kind === 'answer' && row.inProgress) return 'resposta em curso'
  return answer === 1 ? 'resposta' : `${answer} respostas`
}

export function countActivitySteps(items: TurnTimelineItem[]): number {
  return items.filter((i) => i.kind !== 'status').length
}
