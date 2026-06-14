/**
 * Ponte unificada: HTTP (servidor Luna) com fallback para IPC Electron.
 */
import {
  lunaServerChat,
  lunaServerChatStream,
  lunaServerHealth,
  lunaServerListModels,
  lunaServerVisionDescribe,
  buildLlmPayload,
} from './lunaServer/httpBridge'
import { isLunaServerBridgeAvailable } from './lunaServer/config'
import type { LlmStreamCallbacks } from './llmStreamClient'
import type {
  CompleteLlmOptions,
  LlmApiMessage,
  LlmChatResult,
} from './togetherClient'

let serverOk: boolean | null = null
let serverCheckAt = 0
const SERVER_CHECK_TTL_MS = 5000

async function preferServer(): Promise<boolean> {
  if (!isLunaServerBridgeAvailable()) return false
  const now = Date.now()
  if (serverOk !== null && now - serverCheckAt < SERVER_CHECK_TTL_MS) {
    return serverOk
  }
  serverOk = await lunaServerHealth()
  serverCheckAt = now
  return serverOk
}

function ipcLlm() {
  if (typeof window === 'undefined') return undefined
  return window.llm ?? window.together
}

export async function bridgeListModels(options?: { lunarCloud?: boolean }) {
  if (await preferServer()) return lunaServerListModels()
  const b = ipcLlm()
  if (b?.listModels) return b.listModels(options)
  return { ok: false as const, error: 'Lista de modelos indisponível.' }
}

export async function bridgeLlmChat(
  messages: LlmApiMessage[],
  options?: CompleteLlmOptions,
): Promise<LlmChatResult> {
  const payload = buildLlmPayload(messages, options)
  if (await preferServer()) return lunaServerChat(payload, options?.signal)
  const b = ipcLlm()
  if (!b?.chat) {
    return {
      ok: false,
      error:
        'LLM indisponível — inicie `npm run dev` (servidor + Electron) ou só o servidor com `npm run server`.',
    }
  }
  return (await b.chat(
    payload as Parameters<NonNullable<typeof b.chat>>[0],
  )) as LlmChatResult
}

export async function bridgeLlmChatStream(
  messages: LlmApiMessage[],
  callbacks: LlmStreamCallbacks,
  options?: CompleteLlmOptions,
): Promise<LlmChatResult> {
  const payload = buildLlmPayload(messages, options)
  if (await preferServer()) return lunaServerChatStream(payload, callbacks, options?.signal)
  const b = ipcLlm()
  if (!b?.chatStream) {
    return {
      ok: false,
      error: 'Streaming indisponível — servidor Luna ou Electron necessário.',
    }
  }
  return b.chatStream(
    payload as Parameters<NonNullable<typeof b.chatStream>>[0],
    callbacks,
  ) as Promise<LlmChatResult>
}

export async function bridgeVisionDescribe(payload: {
  images: { mime: string; dataBase64: string }[]
  userCaption: string
}) {
  if (await preferServer()) return lunaServerVisionDescribe(payload)
  const b = ipcLlm()
  if (!b?.visionDescribe) {
    return {
      ok: false as const,
      error: 'Visão indisponível — inicie o servidor Luna ou o Electron.',
    }
  }
  return b.visionDescribe(payload)
}

export async function bridgeTranslate(payload: {
  text: string
  to: string
  from?: string
}) {
  if (await preferServer()) {
    const res = await fetch(`${window.lunaServer!.baseUrl.replace(/\/$/, '')}/v1/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return (await res.json()) as { ok: true; text: string } | { ok: false; error: string }
  }
  if (!window.translation?.translate) {
    return { ok: false as const, error: 'Tradução indisponível.' }
  }
  return window.translation.translate(payload)
}

export async function bridgeRag<T>(
  ipcFn: () => Promise<T>,
  httpPath: string,
  init?: RequestInit,
): Promise<T> {
  if (await preferServer()) {
    try {
      const base = window.lunaServer!.baseUrl.replace(/\/$/, '')
      const res = await fetch(`${base}${httpPath}`, init)
      if (res.ok) {
        return (await res.json()) as T
      }
    } catch {
      /* servidor indisponível — tenta IPC abaixo */
    }
  }
  return ipcFn()
}

export function resetServerHealthCache() {
  serverOk = null
  serverCheckAt = 0
}

export async function bridgeAgentListDirectory(dirPath: string) {
  return bridgeRag(
    () =>
      window.agentTools?.listDirectory(dirPath) ??
      Promise.resolve({ ok: false, error: 'Ferramentas indisponíveis.' }),
    '/v1/tools/list-directory',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: dirPath }),
    },
  )
}

export async function bridgeAgentReadFile(filePath: string, maxChars?: number) {
  return bridgeRag(
    () =>
      window.agentTools?.readFile(filePath, maxChars) ??
      Promise.resolve({ ok: false, error: 'Ferramentas indisponíveis.' }),
    '/v1/tools/read-file',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, max_chars: maxChars }),
    },
  )
}

export async function bridgeAgentWebSearch(query: string) {
  return bridgeRag(
    () =>
      window.agentTools?.webSearch(query) ??
      Promise.resolve({ ok: false, error: 'Pesquisa web indisponível.' }),
    '/v1/tools/web-search',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    },
  )
}

function bridgeTool<T>(
  ipcFn: () => Promise<T>,
  httpPath: string,
  body: Record<string, unknown>,
): Promise<T> {
  return bridgeRag(ipcFn, httpPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function bridgeAgentSetWorkspaceRoot(rootPath: string | null) {
  return bridgeTool(
    () =>
      window.agentTools?.setWorkspaceRoot(rootPath) ??
      Promise.resolve({ ok: false, error: 'Ferramentas indisponíveis.' }),
    '/v1/tools/set-workspace-root',
    { path: rootPath ?? '' },
  )
}

export async function bridgeAgentSetWorkspaceRoots(paths: string[]) {
  return bridgeTool(
    () =>
      window.agentTools?.setWorkspaceRoots(paths) ??
      Promise.resolve({ ok: false, error: 'Ferramentas indisponíveis.' }),
    '/v1/tools/set-workspace-roots',
    { paths },
  )
}

export async function bridgeAgentWriteFile(filePath: string, content: string) {
  return bridgeTool(
    () =>
      window.agentTools?.writeFile(filePath, content) ??
      Promise.resolve({ ok: false, error: 'Escrita indisponível.' }),
    '/v1/tools/write-file',
    { path: filePath, content },
  )
}

export async function bridgeAgentCreateDirectory(dirPath: string) {
  return bridgeTool(
    () =>
      window.agentTools?.createDirectory(dirPath) ??
      Promise.resolve({ ok: false, error: 'Criação de pasta indisponível.' }),
    '/v1/tools/create-directory',
    { path: dirPath },
  )
}

export async function bridgeAgentDeletePath(targetPath: string) {
  return bridgeTool(
    () =>
      window.agentTools?.deletePath(targetPath) ??
      Promise.resolve({ ok: false, error: 'Eliminação indisponível.' }),
    '/v1/tools/delete-path',
    { path: targetPath },
  )
}

export async function bridgeAgentRenamePath(fromPath: string, toPath: string) {
  return bridgeTool(
    () =>
      window.agentTools?.renamePath(fromPath, toPath) ??
      Promise.resolve({ ok: false, error: 'Renomear indisponível.' }),
    '/v1/tools/rename-path',
    { from: fromPath, to: toPath },
  )
}

export async function bridgeAgentGrep(
  pattern: string,
  searchPath?: string,
  caseSensitive?: boolean,
) {
  return bridgeTool(
    () =>
      window.agentTools?.grep(pattern, searchPath, { case_sensitive: caseSensitive }) ??
      Promise.resolve({ ok: false, error: 'Grep indisponível.' }),
    '/v1/tools/grep',
    {
      pattern,
      path: searchPath,
      case_sensitive: caseSensitive === true,
    },
  )
}

export async function bridgeAgentGlob(pattern: string, searchPath?: string) {
  return bridgeTool(
    () =>
      window.agentTools?.glob(pattern, searchPath) ??
      Promise.resolve({ ok: false, error: 'Glob indisponível.' }),
    '/v1/tools/glob',
    { pattern, path: searchPath },
  )
}

export async function bridgeAgentRunCommand(
  command: string,
  cwd?: string,
  options?: { gui?: boolean },
) {
  return bridgeTool(
    () =>
      window.agentTools?.runCommand(command, cwd, options) ??
      Promise.resolve({ ok: false, error: 'Terminal indisponível.' }),
    '/v1/tools/run-command',
    { command, cwd, gui: options?.gui === true },
  )
}

export async function bridgeAgentGitStatus(repoPath?: string) {
  return bridgeTool(
    () =>
      window.agentTools?.gitStatus(repoPath) ??
      Promise.resolve({ ok: false, error: 'Git indisponível.' }),
    '/v1/tools/git-status',
    { path: repoPath },
  )
}

export async function bridgeAgentGitDiff(repoPath?: string, staged?: boolean) {
  return bridgeTool(
    () =>
      window.agentTools?.gitDiff(repoPath, staged) ??
      Promise.resolve({ ok: false, error: 'Git indisponível.' }),
    '/v1/tools/git-diff',
    { path: repoPath, staged: staged === true },
  )
}

export async function bridgeAgentGitCommit(repoPath: string | undefined, message: string) {
  return bridgeTool(
    () =>
      window.agentTools?.gitCommit(repoPath, message) ??
      Promise.resolve({ ok: false, error: 'Git indisponível.' }),
    '/v1/tools/git-commit',
    { path: repoPath, message },
  )
}

export async function bridgeSetWorkbenchLayout(mode: 'chat' | 'ide') {
  if (!window.electron?.setWorkbenchLayout) return
  await window.electron.setWorkbenchLayout(mode)
}
