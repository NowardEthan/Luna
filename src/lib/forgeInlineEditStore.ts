import { useSyncExternalStore } from 'react'
import type { ForgeEditorPane } from '../context/ForgeLayoutContext'

export type ForgeInlineEditDraft = {
  path: string
  content: string
  selectedText: string
  selectionFrom: number
  selectionTo: number
  pane: ForgeEditorPane
}

type ForgeInlineEditState = {
  open: boolean
  draft: ForgeInlineEditDraft | null
  prompt: string
  busy: boolean
}

let state: ForgeInlineEditState = {
  open: false,
  draft: null,
  prompt: '',
  busy: false,
}

const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

function setState(patch: Partial<ForgeInlineEditState>) {
  state = { ...state, ...patch }
  emit()
}

export function getForgeInlineEditState(): ForgeInlineEditState {
  return state
}

export function subscribeForgeInlineEdit(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

export function openForgeInlineEdit(draft: ForgeInlineEditDraft): void {
  setState({ open: true, draft, prompt: '', busy: false })
}

export function closeForgeInlineEdit(): void {
  setState({ open: false, draft: null, prompt: '', busy: false })
}

export function setForgeInlineEditPrompt(prompt: string): void {
  setState({ prompt })
}

export function setForgeInlineEditBusy(busy: boolean): void {
  setState({ busy })
}

export function useForgeInlineEdit(): ForgeInlineEditState {
  return useSyncExternalStore(
    subscribeForgeInlineEdit,
    getForgeInlineEditState,
    getForgeInlineEditState,
  )
}
