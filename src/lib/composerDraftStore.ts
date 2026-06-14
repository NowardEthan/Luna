import { useSyncExternalStore } from 'react'

let draft = ''
const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

export function subscribeComposerDraft(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

function subscribe(onChange: () => void): () => void {
  return subscribeComposerDraft(onChange)
}

export function getComposerDraft(): string {
  return draft
}

export function setComposerDraft(value: string): void {
  if (draft === value) return
  draft = value
  emit()
}

export function clearComposerDraft(): void {
  if (draft === '') return
  draft = ''
  emit()
}

/** Só o composer (e indicadores que precisam do texto) devem subscrever isto. */
export function useComposerDraftText(): string {
  return useSyncExternalStore(subscribe, getComposerDraft, getComposerDraft)
}
