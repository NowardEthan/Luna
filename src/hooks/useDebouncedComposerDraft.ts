import { useEffect, useState } from 'react'
import {
  getComposerDraft,
  subscribeComposerDraft,
} from '../lib/composerDraftStore'

/** Texto do composer com debounce — para estimativas pesadas (context usage). */
export function useDebouncedComposerDraft(delayMs = 300): string {
  const [debounced, setDebounced] = useState(() => getComposerDraft())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const bump = () => {
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        timer = null
        setDebounced(getComposerDraft())
      }, delayMs)
    }
    const unsub = subscribeComposerDraft(bump)
    return () => {
      unsub()
      if (timer) window.clearTimeout(timer)
    }
  }, [delayMs])

  return debounced
}
