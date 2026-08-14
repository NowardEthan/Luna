import type { RagCitation } from './types/chat'

type LlmChatOk = {
  ok: true
  text: string
  toolCalls?: Array<{
    id: string
    type: string
    function: { name: string; arguments: string }
  }>
  reasoningContent?: string
  provider?: 'together' | 'groq' | 'ollama' | 'openrouter'
  usedFallback?: boolean
  fallbackNote?: string
}

type LlmStreamCallbacks = {
  onContent?: (delta: string, full: string) => void
  onReasoning?: (delta: string, full: string) => void
  onToolsPending?: () => void
}

type LlmBridge = {
  listModels: (opts?: { lunarCloud?: boolean }) => Promise<
    | {
        ok: true
        models: Array<{
          id: string
          provider: 'openrouter' | 'groq' | 'together' | 'ollama'
          model: string
          label: string
        }>
      }
    | { ok: false; error: string }
  >
  chat: (payload: {
    messages: unknown[]
    temperature?: number
    max_completion_tokens?: number
    tools?: unknown[]
    tool_choice?: unknown
    reasoning_enabled?: boolean
    llm_provider?: string
    llm_model?: string
  }) => Promise<LlmChatOk | { ok: false; error: string }>
  chatStream?: (
    payload: {
      messages: unknown[]
      temperature?: number
      max_completion_tokens?: number
      tools?: unknown[]
      tool_choice?: unknown
      reasoning_enabled?: boolean
      llm_provider?: string
      llm_model?: string
    },
    callbacks: LlmStreamCallbacks,
  ) => Promise<LlmChatOk | { ok: false; error: string }>
  visionDescribe: (payload: {
    images: { mime: string; dataBase64: string }[]
    userCaption: string
  }) => Promise<
    | {
        ok: true
        text: string
        provider?: 'together' | 'groq' | 'ollama' | 'openrouter'
        usedFallback?: boolean
        fallbackNote?: string
      }
    | { ok: false; error: string }
  >
}

export {}

declare global {
  interface Window {
    /** Base URL do servidor Luna (HTTP) — ver `npm run server` */
    lunaServer?: {
      baseUrl: string
    }
    electron?: {
      minimize: () => Promise<void>
      maximizeToggle: () => Promise<void>
      close: () => Promise<void>
      setWorkbenchLayout?: (mode: 'chat' | 'ide') => Promise<void>
      setLockSize?: (locked: boolean) => Promise<void>
      googleSignIn?: () => Promise<
        | { ok: true; idToken: string; accessToken?: string }
        | { ok: false; error?: string; cancelled?: boolean }
      >
      oauthComplete?: (result: {
        ok: boolean
        error?: string
        cancelled?: boolean
      }) => void
    }
    /** Compatível com o projeto Luna (`electronAPI.startGoogleLogin`). */
    electronAPI?: {
      startGoogleLogin: () => Promise<
        | { success: true; idToken: string; accessToken?: string }
        | { success: false; error?: string }
      >
    }
    translation?: {
      translate: (payload: {
        text: string
        to: string
        from?: string
      }) => Promise<
        | { ok: true; text: string }
        | { ok: false; error: string }
      >
    }
    llm?: LlmBridge
    /** @deprecated alias de `llm` */
    together?: LlmBridge
    rag?: {
      status: () => Promise<
        | {
            ok: true
            chunkCount: number
            indexedFolder: string
            indexedAt: string
          }
        | { ok: false; error: string; chunkCount: number }
      >
      clear: () => Promise<{ ok: boolean; error?: string }>
      indexFolder: (folderPath: string) => Promise<
        | {
            ok: true
            filesScanned: number
            chunksIndexed: number
            folder: string
          }
        | { ok: false; error: string; indexed?: number }
      >
      retrieve: (query: string) => Promise<
        | {
            ok: true
            context: string
            citations: RagCitation[]
          }
        | {
            ok: false
            error: string
            context: string
            citations: []
          }
      >
      pickFolder: () => Promise<
        | { canceled: true; path: null }
        | { canceled: false; path: string }
      >
      pickFiles: () => Promise<
        | { canceled: true; paths: string[] }
        | { canceled: false; paths: string[] }
      >
      indexFiles: (paths: string[]) => Promise<
        | {
            ok: true
            filesScanned: number
            chunksIndexed: number
            folder: string
          }
        | { ok: false; error: string; indexed?: number }
      >
    }
    lunaFiles?: {
      getPlaces: () => Promise<{
        ok: boolean
        places?: { id: string; label: string; path: string; icon: string }[]
        home?: string
      }>
      listDirectory: (
        dirPath: string,
        options?: { showHidden?: boolean },
      ) => Promise<{
        ok: boolean
        error?: string
        path?: string
        parent?: string
        entries?: {
          name: string
          path: string
          type: string
          size?: number
          modifiedAt?: number
        }[]
        truncated?: boolean
      }>
      readFileBinary: (
        filePath: string,
        maxBytes?: number,
      ) => Promise<{
        ok: boolean
        error?: string
        path?: string
        name?: string
        size?: number
        mime?: string
        base64?: string
      }>
    }
    byok?: {
      canEncrypt: () => Promise<{ ok: boolean; available?: boolean }>
      saveKey: (payload: {
        uid: string
        providerId: string
        apiKey: string
      }) => Promise<{ ok: boolean; keyHint?: string; error?: string }>
      deleteKey: (payload: {
        uid: string
        providerId: string
      }) => Promise<{ ok: boolean; error?: string }>
      listKeyHints: (
        uid: string,
      ) => Promise<{ ok: boolean; hints?: Record<string, boolean>; error?: string }>
      test: (payload: {
        providerId: string
        apiKey: string
        baseUrl?: string
        modelMenor?: string
        modelMaior?: string
      }) => Promise<{ ok: boolean; error?: string }>
    }
    lunaCore: {
      executarPipeline: (
        mensagem: string,
        sessaoId?: string,
        opcoes?: import('./types/lunaCorePipeline').LunaCorePipelineOptions,
      ) => Promise<import('./types/lunaCoreResult').LunaCoreResultado>
      prepararSessao: (
        sessaoId: string,
      ) => Promise<{ ok: boolean; sessaoId?: string; error?: string }>
      refletirSessao: (sessaoId: string) => Promise<{
        ok: boolean
        candidatos?: number
        salvos?: number
        error?: string
      }>
      listarMemoriaLonga: (limit?: number) => Promise<{
        ok: boolean
        fatos?: import('./hooks/useLunaCoreMemory').LunaCoreMemoryFact[]
        error?: string
      }>
      getLlmRuntimeInfo?: () => Promise<{
        ok: boolean
        detectedMode?: 'local' | 'cloud'
        lunaApiBase?: string
        modeloMaior?: string
        modeloMenor?: string
        ollamaBase?: string
        groqConfigured?: boolean
        error?: string
      }>
      listLocalModels?: (opts: {
        baseUrl: string
        apiKey?: string
      }) => Promise<{
        ok: boolean
        models?: Array<{ id: string; label: string }>
        error?: string
      }>
      testLocalLlm?: (opts: {
        baseUrl: string
        apiKey?: string
        modeloMaior?: string
      }) => Promise<{
        ok: boolean
        latencyMs?: number
        modelCount?: number
        error?: string
      }>
      applyLocalProfile?: (
        profile: import('./lib/lunaLocalLlmProfile').LunaLocalLlmProfile,
      ) => Promise<{
        ok: boolean
        coreEnvPath?: string
        orbitEnvPath?: string
        error?: string
      }>
    }
    forgeTerminal?: {
      create: (opts: {
        cwd?: string
        cols?: number
        rows?: number
      }) => Promise<{
        ok: boolean
        error?: string
        id?: string
        shell?: string
        cwd?: string
      }>
      write: (
        id: string,
        data: string,
      ) => Promise<{ ok: boolean; error?: string }>
      resize: (
        id: string,
        cols: number,
        rows: number,
      ) => Promise<{ ok: boolean; error?: string }>
      kill: (id: string) => Promise<{ ok: boolean; error?: string }>
      onData: (
        callback: (payload: {
          id: string
          data?: string
          exitCode?: number
        }) => void,
      ) => () => void
    }
    forgeLsp?: {
      setWorkspaceRoot: (
        rootPath: string | null,
      ) => Promise<{ ok: boolean; error?: string; path?: string }>
      openDocument: (doc: {
        path: string
        languageId: string
        text: string
        version?: number
      }) => Promise<{ ok: boolean; error?: string }>
      changeDocument: (doc: {
        path: string
        text: string
        version: number
      }) => Promise<{ ok: boolean; error?: string }>
      closeDocument: (filePath: string) => Promise<{ ok: boolean; error?: string }>
      completion: (pos: {
        path: string
        line: number
        character: number
      }) => Promise<{ ok: boolean; error?: string; result?: unknown }>
      hover: (pos: {
        path: string
        line: number
        character: number
      }) => Promise<{ ok: boolean; error?: string; result?: unknown }>
      definition: (pos: {
        path: string
        line: number
        character: number
      }) => Promise<{ ok: boolean; error?: string; result?: unknown }>
      onDiagnostics: (
        callback: (payload: { path: string; diagnostics: unknown[] }) => void,
      ) => () => void
    }
    agentTools?: {
      listDirectory: (dirPath: string) => Promise<{
        ok: boolean
        error?: string
        path?: string
        entries?: { name: string; path: string; type: string }[]
        truncated?: boolean
      }>
      readFile: (
        filePath: string,
        maxChars?: number,
      ) => Promise<{
        ok: boolean
        error?: string
        path?: string
        content?: string
        truncated?: boolean
      }>
      webSearch: (query: string) => Promise<{
        ok: boolean
        error?: string
        query?: string
        answer?: string
        results?: { title?: string; url?: string; content?: string }[]
      }>
      setWorkspaceRoot: (rootPath: string | null) => Promise<{ ok: boolean; error?: string; path?: string | null; paths?: string[] }>
      setWorkspaceRoots: (paths: string[]) => Promise<{ ok: boolean; error?: string; path?: string | null; paths?: string[] }>
      writeFile: (filePath: string, content: string) => Promise<{ ok: boolean; error?: string; path?: string }>
      createDirectory: (dirPath: string) => Promise<{ ok: boolean; error?: string; path?: string }>
      deletePath: (targetPath: string) => Promise<{ ok: boolean; error?: string; path?: string }>
      renamePath: (
        fromPath: string,
        toPath: string,
      ) => Promise<{ ok: boolean; error?: string; from?: string; to?: string }>
      grep: (
        pattern: string,
        searchPath?: string,
        options?: { case_sensitive?: boolean },
      ) => Promise<{ ok: boolean; error?: string; matches?: unknown[] }>
      glob: (
        pattern: string,
        searchPath?: string,
      ) => Promise<{ ok: boolean; error?: string; paths?: unknown[] }>
      runCommand: (
        command: string,
        cwd?: string,
        options?: { gui?: boolean },
      ) => Promise<{
        ok: boolean
        error?: string
        stdout?: string
        stderr?: string
        exit_code?: number | null
        gui?: boolean
        pid?: number | null
        message?: string
      }>
      gitStatus: (repoPath?: string) => Promise<{ ok: boolean; error?: string; output?: string }>
      gitDiff: (
        repoPath?: string,
        staged?: boolean,
      ) => Promise<{ ok: boolean; error?: string; diff?: string }>
      gitCommit: (
        repoPath: string | undefined,
        message: string,
      ) => Promise<{ ok: boolean; error?: string; output?: string }>
    }
    plugins?: {
      pickAndInstall: () => Promise<
        | { ok: false; canceled: true }
        | { ok: false; error: string }
        | {
            ok: true
            manifest: {
              id: string
              name: string
              version?: string
              description?: string
              entry?: string
              permissions?: string[]
              trusted?: boolean
              lunaApiVersion?: string
            }
            rootPath: string
            needsReload: boolean
            installedAt: string
          }
      >
      installFromDirectory: (dirPath: string) => Promise<
        | { ok: false; canceled?: boolean; error: string }
        | {
            ok: true
            manifest: {
              id: string
              name: string
              version?: string
              description?: string
              entry?: string
              permissions?: string[]
              trusted?: boolean
              lunaApiVersion?: string
            }
            rootPath: string
            needsReload?: boolean
            installedAt: string
          }
      >
      installBundled: (pluginId: string) => Promise<
        | { ok: false; error: string }
        | {
            ok: true
            manifest: {
              id: string
              name: string
              version?: string
              description?: string
              entry?: string
              permissions?: string[]
              trusted?: boolean
              lunaApiVersion?: string
            }
            rootPath: string
            needsReload: boolean
            installedAt: string
          }
      >
      installFromUrl: (url: string) => Promise<
        | { ok: false; error: string }
        | {
            ok: true
            manifest: {
              id: string
              name: string
              version?: string
              description?: string
              entry?: string
              permissions?: string[]
              trusted?: boolean
              lunaApiVersion?: string
            }
            rootPath: string
            needsReload: boolean
            installedAt: string
          }
      >
      uninstall: (pluginId: string) => Promise<{ ok: boolean; error?: string }>
      readEntry: (pluginId: string) => Promise<
        | { ok: true; source: string; entry: string }
        | { ok: false; error: string }
      >
    }
    chatMemory?: {
      sync: (payload: {
        conversations: Array<{
          id: string
          title: string
          messages: Array<{
            id: string
            role: string
            text: string
            visionDescription?: string
          }>
          memory?: { rollingSummary: string }
        }>
      }) => Promise<
        | {
            ok: true
            chunksTotal: number
            reEmbedded: number
            removed: number
          }
        | { ok: false; error: string; added?: number; removed?: number }
      >
      retrieve: (query: string) => Promise<
        | { ok: true; text: string }
        | { ok: false; error: string; text: string }
      >
      status: () => Promise<
        | { ok: true; chunkCount: number }
        | { ok: false; error: string; chunkCount: number }
      >
      clear: () => Promise<{ ok: boolean; error?: string }>
    }
  }
}
