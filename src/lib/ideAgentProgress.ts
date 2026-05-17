import { useSyncExternalStore } from 'react'

export type IdeAgentProgress = {
  round: number
  phase: string
}

let progress: IdeAgentProgress | null = null
const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

export function setIdeAgentProgress(next: IdeAgentProgress | null) {
  progress = next
  emit()
}

export function getIdeAgentProgress(): IdeAgentProgress | null {
  return progress
}

export function subscribeIdeAgentProgress(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useIdeAgentProgress(): IdeAgentProgress | null {
  return useSyncExternalStore(
    subscribeIdeAgentProgress,
    getIdeAgentProgress,
    getIdeAgentProgress,
  )
}
