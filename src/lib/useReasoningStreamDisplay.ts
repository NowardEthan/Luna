import { useEffect, useRef, useState } from 'react'
import { isReasoningBulkJump } from './reasoningStreamUi'

const TYPEWRITER_MS = 36

/**
 * Texto visível no badge: segue `target` em streaming;
 * anima typewriter quando o modelo manda um bloco grande de uma vez.
 */
export function useReasoningStreamDisplay(
  target: string,
  streaming: boolean,
): string {
  const [visible, setVisible] = useState(target)
  const prevLenRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const indexRef = useRef(0)

  useEffect(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    if (!streaming) {
      setVisible(target)
      prevLenRef.current = target.length
      indexRef.current = target.length
      return
    }

    const prevLen = prevLenRef.current
    const bulk =
      target.length > prevLen &&
      isReasoningBulkJump(prevLen, target.length)

    if (!bulk) {
      setVisible(target)
      prevLenRef.current = target.length
      indexRef.current = target.length
      return
    }

    indexRef.current = prevLen
    let last = performance.now()

    const tick = (now: number) => {
      if (now - last >= TYPEWRITER_MS) {
        last = now
        indexRef.current = Math.min(indexRef.current + 1, target.length)
        setVisible(target.slice(0, indexRef.current))
      }
      if (indexRef.current < target.length) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        prevLenRef.current = target.length
        rafRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    prevLenRef.current = target.length

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [target, streaming])

  return visible
}
