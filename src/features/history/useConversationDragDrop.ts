import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

const DRAG_THRESHOLD_PX = 6

export type HistoryDropTarget =
  | { kind: 'folder'; folderId: string }
  | { kind: 'root' }

export type DragGhost = {
  x: number
  y: number
  title: string
}

function targetsEqual(
  a: HistoryDropTarget | null,
  b: HistoryDropTarget | null,
): boolean {
  if (!a || !b) return false
  if (a.kind !== b.kind) return false
  if (a.kind === 'root' && b.kind === 'root') return true
  if (a.kind === 'folder' && b.kind === 'folder') return a.folderId === b.folderId
  return false
}

function resolveDropTarget(x: number, y: number): HistoryDropTarget | null {
  const el = document.elementFromPoint(x, y)
  const zone = el?.closest('[data-history-drop]') as HTMLElement | null
  if (!zone) return null
  const kind = zone.dataset.historyDrop
  if (kind === 'root') return { kind: 'root' }
  if (kind === 'folder' && zone.dataset.historyDropFolder) {
    return { kind: 'folder', folderId: zone.dataset.historyDropFolder }
  }
  return null
}

export function historyDropZoneClass(active: boolean): string {
  return active ? 'border-accent bg-raised' : ''
}

export function historyDropZoneAttrs(target: HistoryDropTarget): Record<string, string> {
  if (target.kind === 'root') {
    return { 'data-history-drop': 'root' }
  }
  return {
    'data-history-drop': 'folder',
    'data-history-drop-folder': target.folderId,
  }
}

export function useConversationDragDrop(
  onMove: (conversationId: string, folderId: string | null) => void,
  getCurrentFolderId: (conversationId: string) => string | null | undefined,
  onHoverFolder?: (folderId: string) => void,
) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<HistoryDropTarget | null>(null)
  const [ghost, setGhost] = useState<DragGhost | null>(null)

  const draggingIdRef = useRef<string | null>(null)
  const dropTargetRef = useRef<HistoryDropTarget | null>(null)
  const lastHoverFolderRef = useRef<string | null>(null)

  const clearDrag = useCallback(() => {
    draggingIdRef.current = null
    dropTargetRef.current = null
    lastHoverFolderRef.current = null
    setDraggingId(null)
    setDropTarget(null)
    setGhost(null)
    document.body.style.removeProperty('cursor')
    document.body.classList.remove('select-none')
  }, [])

  const commitMove = useCallback(
    (conversationId: string, target: HistoryDropTarget) => {
      const nextFolderId = target.kind === 'root' ? null : target.folderId
      const current = getCurrentFolderId(conversationId) ?? null
      if (current !== nextFolderId) {
        onMove(conversationId, nextFolderId)
      }
    },
    [getCurrentFolderId, onMove],
  )

  const updateDropAt = useCallback(
    (clientX: number, clientY: number, title: string) => {
      setGhost({ x: clientX, y: clientY, title })
      const target = resolveDropTarget(clientX, clientY)
      dropTargetRef.current = target
      setDropTarget(target)
      if (target?.kind === 'folder' && target.folderId !== lastHoverFolderRef.current) {
        lastHoverFolderRef.current = target.folderId
        onHoverFolder?.(target.folderId)
      }
      if (!target || target.kind !== 'folder') {
        lastHoverFolderRef.current = null
      }
    },
    [onHoverFolder],
  )

  const gripPointerDown = useCallback(
    (conversationId: string, title: string) =>
      (e: ReactPointerEvent<Element>) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.stopPropagation()

        const grip = e.currentTarget as HTMLElement
        try {
          grip.setPointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }

        const startX = e.clientX
        const startY = e.clientY
        let active = false

        const onPointerMove = (ev: PointerEvent) => {
          if (!active) {
            const dx = ev.clientX - startX
            const dy = ev.clientY - startY
            if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
              return
            }
            active = true
            draggingIdRef.current = conversationId
            setDraggingId(conversationId)
            document.body.style.cursor = 'grabbing'
            document.body.classList.add('select-none')
          }
          if (draggingIdRef.current === conversationId) {
            updateDropAt(ev.clientX, ev.clientY, title)
          }
        }

        const finish = (ev: PointerEvent) => {
          window.removeEventListener('pointermove', onPointerMove)
          window.removeEventListener('pointerup', finish)
          window.removeEventListener('pointercancel', finish)
          try {
            if (grip.hasPointerCapture(ev.pointerId)) {
              grip.releasePointerCapture(ev.pointerId)
            }
          } catch {
            /* ignore */
          }

          if (active && draggingIdRef.current === conversationId) {
            const target = resolveDropTarget(ev.clientX, ev.clientY)
            if (target) {
              commitMove(conversationId, target)
            }
          }
          clearDrag()
        }

        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', finish)
        window.addEventListener('pointercancel', finish)
      },
    [clearDrag, commitMove, updateDropAt],
  )

  const isDropActive = useCallback(
    (target: HistoryDropTarget) => targetsEqual(dropTarget, target),
    [dropTarget],
  )

  return {
    draggingId,
    dropTarget,
    ghost,
    isDragging: draggingId !== null,
    gripPointerDown,
    isDropActive,
    clearDrag,
  }
}
