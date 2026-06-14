import type { LunaFilePickerAccept } from './lunaFileExplorer'
import { isLunaFileExplorerAvailable } from './lunaFileExplorer'

export type LunaPickFilesOptions = {
  title: string
  confirmLabel?: string
  accept?: LunaFilePickerAccept
  multiple?: boolean
  initialPath?: string
}

export type LunaPickPathsOptions = LunaPickFilesOptions

export type LunaPickFolderOptions = {
  title?: string
  confirmLabel?: string
  initialPath?: string
}

type PendingRequest =
  | {
      kind: 'files'
      options: LunaPickFilesOptions
      resolve: (value: File[] | null) => void
    }
  | {
      kind: 'paths'
      options: LunaPickPathsOptions
      resolve: (value: string[] | null) => void
    }
  | {
      kind: 'folder'
      options: LunaPickFolderOptions
      resolve: (value: string | null) => void
    }

export type LunaFileExplorerHostState = {
  open: boolean
  request: PendingRequest | null
}

type Listener = (state: LunaFileExplorerHostState) => void

let listener: Listener | null = null
let state: LunaFileExplorerHostState = { open: false, request: null }

function emit() {
  listener?.(state)
}

export function subscribeLunaFileExplorerHost(fn: Listener): () => void {
  listener = fn
  fn(state)
  return () => {
    if (listener === fn) listener = null
  }
}

function openRequest(req: PendingRequest) {
  state = { open: true, request: req }
  emit()
}

function closeWith<T>(resolve: (v: T) => void, value: T) {
  state = { open: false, request: null }
  emit()
  resolve(value)
}

export function cancelLunaFileExplorerPrompt() {
  const req = state.request
  if (!req) return
  if (req.kind === 'files') closeWith(req.resolve, null)
  else if (req.kind === 'paths') closeWith(req.resolve, null)
  else closeWith(req.resolve, null)
}

export function resolveLunaFileExplorerFiles(files: File[]) {
  const req = state.request
  if (!req || req.kind !== 'files') return
  closeWith(req.resolve, files)
}

export function resolveLunaFileExplorerPaths(paths: string[]) {
  const req = state.request
  if (!req) return
  if (req.kind === 'folder') {
    closeWith(req.resolve, paths[0] ?? null)
    return
  }
  if (req.kind === 'paths') {
    closeWith(req.resolve, paths)
  }
}

export function lunaPickFiles(options: LunaPickFilesOptions): Promise<File[] | null> {
  if (!isLunaFileExplorerAvailable()) return Promise.resolve(null)
  return new Promise((resolve) => {
    openRequest({ kind: 'files', options, resolve })
  })
}

export function lunaPickPaths(options: LunaPickPathsOptions): Promise<string[] | null> {
  if (!isLunaFileExplorerAvailable()) return Promise.resolve(null)
  return new Promise((resolve) => {
    openRequest({ kind: 'paths', options, resolve })
  })
}

export function lunaPickFolder(
  options: LunaPickFolderOptions = {},
): Promise<string | null> {
  if (!isLunaFileExplorerAvailable()) return Promise.resolve(null)
  return new Promise((resolve) => {
    openRequest({ kind: 'folder', options, resolve })
  })
}
