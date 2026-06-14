/** Distância ao fundo (px) para considerar «colado ao fim». */
export const CHAT_SCROLL_BOTTOM_THRESHOLD_PX = 80

export function distanceFromBottom(el: HTMLElement): number {
  return el.scrollHeight - el.scrollTop - el.clientHeight
}

export function isNearChatBottom(
  el: HTMLElement,
  threshold = CHAT_SCROLL_BOTTOM_THRESHOLD_PX,
): boolean {
  return distanceFromBottom(el) <= threshold
}

export function scrollChatToBottom(
  el: HTMLElement,
  behavior: ScrollBehavior = 'auto',
): void {
  el.scrollTo({ top: el.scrollHeight, behavior })
}

export function scrollChatToMessageTop(
  listEl: HTMLElement,
  messageId: string,
  behavior: ScrollBehavior = 'smooth',
): void {
  const node = listEl.querySelector(
    `[data-message-id="${CSS.escape(messageId)}"]`,
  )
  node?.scrollIntoView({ behavior, block: 'start', inline: 'nearest' })
}
