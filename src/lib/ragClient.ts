import type { RagCitation } from '../types/chat'
import { bridgeRag } from './lunaBridge'
import {
  lunaPickFolder,
  lunaPickPaths,
} from './lunaFileExplorerPrompt'
import { isLunaFileExplorerAvailable } from './lunaFileExplorer'
import { RAG_INDEXABLE_EXTENSIONS } from './ragFileExtensions'

export type RagStatus =
  | {
      ok: true
      chunkCount: number
      indexedFolder: string
      indexedAt: string
    }
  | { ok: false; error: string; chunkCount: number }

export type RagIndexResult =
  | {
      ok: true
      filesScanned: number
      chunksIndexed: number
      folder: string
    }
  | { ok: false; error: string; indexed?: number }

export type RagRetrieveResult =
  | { ok: true; context: string; citations: RagCitation[] }
  | { ok: false; error: string; context: string; citations: [] }

export type PickFolderResult =
  | { canceled: true; path: null }
  | { canceled: false; path: string }

export type PickFilesResult =
  | { canceled: true; paths: string[] }
  | { canceled: false; paths: string[] }

export async function ragStatus(): Promise<RagStatus> {
  return bridgeRag(
    () =>
      window.rag?.status() ??
      Promise.resolve({
        ok: false,
        error: 'RAG indisponível.',
        chunkCount: 0,
      } as RagStatus),
    '/v1/rag/status',
    { method: 'GET' },
  )
}

export async function ragClear(): Promise<{ ok: boolean; error?: string }> {
  return bridgeRag(
    () => window.rag?.clear() ?? Promise.resolve({ ok: false }),
    '/v1/rag',
    { method: 'DELETE' },
  )
}

export async function ragIndexFolder(
  folderPath: string,
): Promise<RagIndexResult> {
  return bridgeRag(
    () =>
      window.rag?.indexFolder(folderPath) ??
      Promise.resolve({ ok: false, error: 'RAG indisponível.' }),
    '/v1/rag/index/folder',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderPath }),
    },
  )
}

export async function ragPickFolder(): Promise<PickFolderResult> {
  if (isLunaFileExplorerAvailable()) {
    const path = await lunaPickFolder({
      title: 'Pasta para indexar',
      confirmLabel: 'Indexar esta pasta',
    })
    if (!path) return { canceled: true, path: null }
    return { canceled: false, path }
  }
  if (!window.rag?.pickFolder) {
    return { canceled: true, path: null }
  }
  return window.rag.pickFolder()
}

export async function ragPickFiles(): Promise<PickFilesResult> {
  if (isLunaFileExplorerAvailable()) {
    const paths = await lunaPickPaths({
      title: 'Arquivos para indexar',
      confirmLabel: 'Indexar selecionados',
      multiple: true,
      accept: { extensions: [...RAG_INDEXABLE_EXTENSIONS], maxFiles: 50 },
    })
    if (!paths?.length) return { canceled: true, paths: [] }
    return { canceled: false, paths }
  }
  if (!window.rag?.pickFiles) {
    return { canceled: true, paths: [] }
  }
  return window.rag.pickFiles()
}

export async function ragIndexFiles(
  paths: string[],
): Promise<RagIndexResult> {
  return bridgeRag(
    () =>
      window.rag?.indexFiles(paths) ??
      Promise.resolve({ ok: false, error: 'RAG indisponível.' }),
    '/v1/rag/index/files',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePaths: paths }),
    },
  )
}

export async function ragRetrieve(query: string): Promise<RagRetrieveResult> {
  return bridgeRag(
    () =>
      window.rag?.retrieve(query) ??
      Promise.resolve({
        ok: false,
        error: 'RAG indisponível.',
        context: '',
        citations: [],
      }),
    '/v1/rag/retrieve',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    },
  )
}
