/** Atributo em menus/popovers portados para `document.body` (ex.: `Select`). */
export const LUNA_FLOATING_OVERLAY_ATTR = 'data-luna-floating-overlay'

export function isInsideLunaFloatingOverlay(node: Node | null): boolean {
  if (!(node instanceof Element)) return false
  return Boolean(node.closest(`[${LUNA_FLOATING_OVERLAY_ATTR}]`))
}
