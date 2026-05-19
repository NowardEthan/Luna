import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { languageIdFromPath } from '../lib/languageFromPath'
import {
  bridgeAgentGitCommit,
  bridgeAgentReadFile,
  bridgeAgentSetWorkspaceRoot,
  bridgeAgentWriteFile,
} from '../lib/lunaBridge'
import { setIdeTurnHost, type IdeTurnHost } from '../lib/ideTurnHost'
import { ragIndexFolder, ragPickFolder } from '../lib/ragClient'
import { readIdeAutoApply } from '../lib/ideContextConfig'
import {
  saveCheckpoint,
  WORKSPACE_CHECKPOINT_CONV_ID,
  type LunaCheckpoint,
} from '../lib/lunaCheckpoint'
import { resolveWorkspaceFilePath } from '../lib/resolveWorkspaceFilePath'
import { showToast } from '../lib/toast'
import { scheduleWorkspaceRagSync } from '../lib/workspaceRagSync'
import { eventBus } from '../core/events/EventBus'

const WORKSPACE_ROOT_KEY = 'luna-workspace-root'

export type OpenFileTab = {
  path: string
  content: string
  dirty: boolean
  languageId: string
}

export type PatchProposal = {
  id: string
  path: string
  summary: string
  oldContent: string
  newContent: string
  createdAt: number
}

export type GitCommitProposal = {
  id: string
  message: string
  createdAt: number
}

export type TerminalLine = {
  stream: 'stdout' | 'stderr'
  text: string
}

type LunaWorkspaceValue = {
  workspaceRoot: string | null
  openFiles: OpenFileTab[]
  activeFilePath: string | null
  pendingPatches: PatchProposal[]
  pendingGitCommit: GitCommitProposal | null
  terminalLines: TerminalLine[]
  terminalBusy: boolean
  gitDirtyPaths: Set<string>
  openFolder: () => Promise<void>
  openFile: (path: string) => Promise<boolean>
  setActiveFile: (path: string) => void
  closeTab: (path: string) => void
  updateTabContent: (path: string, content: string) => void
  proposePatch: (proposal: Omit<PatchProposal, 'id' | 'createdAt'>) => string
  acceptPatch: (id: string) => Promise<boolean>
  rejectPatch: (id: string) => void
  proposeGitCommit: (message: string) => string
  acceptGitCommit: (id: string) => Promise<boolean>
  rejectGitCommit: () => void
  appendTerminalOutput: (lines: TerminalLine[]) => void
  clearTerminal: () => void
  setTerminalBusy: (busy: boolean) => void
  markGitDirty: (paths: string[]) => void
  refreshActiveFromDisk: () => Promise<void>
  restoreWorkspaceCheckpoint: (checkpoint: LunaCheckpoint) => Promise<boolean>
}

const LunaWorkspaceContext = createContext<LunaWorkspaceValue | null>(null)

function nextProposalId(): string {
  return `patch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function LunaWorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(() => {
    try {
      return localStorage.getItem(WORKSPACE_ROOT_KEY)
    } catch {
      return null
    }
  })
  const [openFiles, setOpenFiles] = useState<OpenFileTab[]>([])
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null)
  const [pendingPatches, setPendingPatches] = useState<PatchProposal[]>([])
  const [pendingGitCommit, setPendingGitCommit] = useState<GitCommitProposal | null>(
    null,
  )
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([])
  const [terminalBusy, setTerminalBusy] = useState(false)
  const [gitDirtyPaths, setGitDirtyPaths] = useState<Set<string>>(new Set())
  const [lastTerminalCommand, setLastTerminalCommand] = useState<{
    command: string
    exitCode?: number
  } | null>(null)

  const workspaceSyncRef = useRef<{
    root: string | null
    promise: Promise<boolean> | null
  }>({ root: null, promise: null })

  const ensureWorkspaceOnServer = useCallback(
    async (root: string | null): Promise<boolean> => {
      if (!root) return false
      const cached = workspaceSyncRef.current
      if (cached.root === root && cached.promise) {
        return cached.promise
      }
      const promise = bridgeAgentSetWorkspaceRoot(root).then((r) => r.ok !== false)
      workspaceSyncRef.current = { root, promise }
      return promise
    },
    [],
  )

  useEffect(() => {
    if (!workspaceRoot) {
      workspaceSyncRef.current = { root: null, promise: null }
      return
    }
    try {
      localStorage.setItem(WORKSPACE_ROOT_KEY, workspaceRoot)
    } catch {
      /* ignore */
    }
    void ensureWorkspaceOnServer(workspaceRoot)
  }, [workspaceRoot, ensureWorkspaceOnServer])

  const openFile = useCallback(async (path: string): Promise<boolean> => {
    if (!path?.trim() || !workspaceRoot) return false
    const ready = await ensureWorkspaceOnServer(workspaceRoot)
    if (!ready) return false

    const existing = openFiles.find((f) => f.path === path)
    if (existing) {
      setActiveFilePath(path)
      return true
    }
    const r = await bridgeAgentReadFile(path)
    if (!r.ok || r.content === undefined) return false
    const tab: OpenFileTab = {
      path,
      content: r.content,
      dirty: false,
      languageId: languageIdFromPath(path),
    }
    setOpenFiles((prev) => [...prev.filter((f) => f.path !== path), tab])
    setActiveFilePath(path)
    return true
  }, [openFiles, workspaceRoot, ensureWorkspaceOnServer])

  const openFolder = useCallback(async () => {
    const picked = await ragPickFolder()
    if (picked.canceled || !picked.path) return
    workspaceSyncRef.current = { root: null, promise: null }
    setWorkspaceRoot(picked.path)
    setOpenFiles([])
    setActiveFilePath(null)
    setPendingPatches([])
    await ensureWorkspaceOnServer(picked.path)
    try {
      const autoIndex =
        globalThis.localStorage?.getItem('luna-ide-index-auto') !== '0'
      if (autoIndex) void ragIndexFolder(picked.path)
    } catch {
      /* ignore */
    }
  }, [ensureWorkspaceOnServer])

  const setActiveFile = useCallback((path: string) => {
    setActiveFilePath(path)
  }, [])

  const closeTab = useCallback(
    (path: string) => {
      setOpenFiles((prev) => prev.filter((f) => f.path !== path))
      setActiveFilePath((cur) => (cur === path ? null : cur))
    },
    [],
  )

  const updateTabContent = useCallback((path: string, content: string) => {
    setOpenFiles((prev) =>
      prev.map((f) =>
        f.path === path ? { ...f, content, dirty: true } : f,
      ),
    )
  }, [])

  const applyPatchToDisk = useCallback(
    async (p: PatchProposal): Promise<boolean> => {
      const diskPath = resolveWorkspaceFilePath(p.path, workspaceRoot)
      if (!diskPath) {
        showToast('Caminho do ficheiro inválido.', 'error')
        return false
      }
      if (workspaceRoot) {
        const ready = await ensureWorkspaceOnServer(workspaceRoot)
        if (!ready) {
          showToast('Workspace não sincronizado com o servidor.', 'error')
          return false
        }
      }
      saveCheckpoint({
        id: `cp-${Date.now()}`,
        convId: WORKSPACE_CHECKPOINT_CONV_ID,
        createdAt: Date.now(),
        label: p.summary,
        files: [{ path: diskPath, content: p.oldContent }],
      })
      const r = await bridgeAgentWriteFile(diskPath, p.newContent)
      if (!r.ok) {
        const err =
          r && typeof r === 'object' && 'error' in r && typeof r.error === 'string'
            ? r.error
            : 'Não foi possível gravar o ficheiro.'
        showToast(err, 'error', 6000)
        return false
      }
      setOpenFiles((prev) => {
        const idx = prev.findIndex(
          (f) => f.path === p.path || f.path === diskPath,
        )
        if (idx === -1) {
          return [
            ...prev,
            {
              path: diskPath,
              content: p.newContent,
              dirty: false,
              languageId: languageIdFromPath(diskPath),
            },
          ]
        }
        return prev.map((f) =>
          f.path === p.path || f.path === diskPath
            ? { ...f, path: diskPath, content: p.newContent, dirty: false }
            : f,
        )
      })
      setActiveFilePath(diskPath)
      setGitDirtyPaths((s) => new Set(s).add(diskPath))
      scheduleWorkspaceRagSync([diskPath])
      return true
    },
    [workspaceRoot, ensureWorkspaceOnServer],
  )

  const proposePatch = useCallback(
    (proposal: Omit<PatchProposal, 'id' | 'createdAt'>): string => {
      const id = nextProposalId()
      const path = resolveWorkspaceFilePath(proposal.path, workspaceRoot)
      setPendingPatches((prev) => [
        {
          ...proposal,
          path,
          id,
          createdAt: Date.now(),
        },
        ...prev,
      ])
      eventBus.emit('workspace:patch:proposed', {
        path,
        proposalId: id,
      })
      return id
    },
    [workspaceRoot],
  )

  const acceptPatch = useCallback(
    async (id: string): Promise<boolean> => {
      const p = pendingPatches.find((x) => x.id === id)
      if (!p) return false
      const ok = await applyPatchToDisk(p)
      if (!ok) return false
      setPendingPatches((prev) => prev.filter((x) => x.id !== id))
      showToast('Alteração aplicada no disco.', 'success')
      eventBus.emit('workspace:patch:accepted', {
        path: p.path,
        proposalId: id,
      })
      return true
    },
    [pendingPatches, applyPatchToDisk],
  )

  const rejectPatch = useCallback((id: string) => {
    setPendingPatches((prev) => {
      const p = prev.find((x) => x.id === id)
      if (p) {
        eventBus.emit('workspace:patch:rejected', {
          path: p.path,
          proposalId: id,
        })
      }
      return prev.filter((x) => x.id !== id)
    })
  }, [])

  const proposeGitCommit = useCallback((message: string): string => {
    const id = `commit-${Date.now()}`
    setPendingGitCommit({
      id,
      message: message.trim().slice(0, 500),
      createdAt: Date.now(),
    })
    return id
  }, [])

  const acceptGitCommit = useCallback(
    async (id: string): Promise<boolean> => {
      if (!pendingGitCommit || pendingGitCommit.id !== id) return false
      const r = await bridgeAgentGitCommit(
        workspaceRoot ?? undefined,
        pendingGitCommit.message,
      )
      if (!r.ok) return false
      setPendingGitCommit(null)
      return true
    },
    [pendingGitCommit, workspaceRoot],
  )

  const rejectGitCommit = useCallback(() => {
    setPendingGitCommit(null)
  }, [])

  const appendTerminalOutput = useCallback((lines: TerminalLine[]) => {
    setTerminalLines((prev) => [...prev, ...lines].slice(-4000))
  }, [])

  const clearTerminal = useCallback(() => {
    setTerminalLines([])
  }, [])

  const markGitDirty = useCallback((paths: string[]) => {
    setGitDirtyPaths((prev) => {
      const n = new Set(prev)
      for (const p of paths) n.add(p)
      return n
    })
  }, [])

  const refreshActiveFromDisk = useCallback(async () => {
    if (!activeFilePath) return
    const r = await bridgeAgentReadFile(activeFilePath)
    if (!r.ok || r.content === undefined) return
    setOpenFiles((prev) =>
      prev.map((f) =>
        f.path === activeFilePath
          ? { ...f, content: r.content!, dirty: false }
          : f,
      ),
    )
  }, [activeFilePath])

  const restoreWorkspaceCheckpoint = useCallback(
    async (checkpoint: LunaCheckpoint): Promise<boolean> => {
      if (!checkpoint.files.length) {
        showToast('Checkpoint sem ficheiros para restaurar.', 'error')
        return false
      }
      if (workspaceRoot) {
        const ready = await ensureWorkspaceOnServer(workspaceRoot)
        if (!ready) {
          showToast('Workspace não sincronizado com o servidor.', 'error')
          return false
        }
      }
      let okCount = 0
      for (const file of checkpoint.files) {
        const r = await bridgeAgentWriteFile(file.path, file.content)
        if (r.ok) {
          okCount++
          setOpenFiles((prev) => {
            const idx = prev.findIndex((f) => f.path === file.path)
            if (idx === -1) {
              return [
                ...prev,
                {
                  path: file.path,
                  content: file.content,
                  dirty: false,
                  languageId: languageIdFromPath(file.path),
                },
              ]
            }
            return prev.map((f) =>
              f.path === file.path
                ? { ...f, content: file.content, dirty: false }
                : f,
            )
          })
          setGitDirtyPaths((s) => new Set(s).add(file.path))
        }
      }
      if (!okCount) {
        showToast('Não foi possível restaurar o checkpoint.', 'error')
        return false
      }
      showToast(
        `Restaurado: ${okCount} ficheiro(s) do estado anterior.`,
        'success',
      )
      return true
    },
    [workspaceRoot, ensureWorkspaceOnServer],
  )

  const readFileFromWorkspace = useCallback(
    async (path: string, maxChars?: number) => {
      const tab = openFiles.find((f) => f.path === path)
      if (tab) {
        const content = maxChars
          ? tab.content.slice(0, maxChars)
          : tab.content
        return {
          ok: true,
          content,
          source: tab.dirty ? ('editor' as const) : ('disk' as const),
        }
      }
      const r = await bridgeAgentReadFile(path, maxChars)
      if (r.ok && r.content !== undefined) {
        return { ok: true, content: r.content, source: 'disk' as const }
      }
      return { ok: false, source: 'missing' as const }
    },
    [openFiles],
  )

  useEffect(() => {
    const host: IdeTurnHost = {
      getSnapshot: () => ({
        workspaceRoot,
        activeFilePath,
        openFiles,
        pendingPatches,
        terminalLines,
        terminalBusy,
        gitDirtyPaths: [...gitDirtyPaths],
        lastTerminalCommand: lastTerminalCommand ?? undefined,
      }),
      proposePatch: (proposal) => {
        const id = nextProposalId()
        const path = resolveWorkspaceFilePath(proposal.path, workspaceRoot)
        const p: PatchProposal = {
          ...proposal,
          path,
          id,
          createdAt: Date.now(),
        }
        setPendingPatches((prev) => [p, ...prev])
        if (readIdeAutoApply()) {
          void (async () => {
            const ok = await applyPatchToDisk(p)
            if (!ok) return
            setPendingPatches((prev) => prev.filter((x) => x.id !== id))
          })()
        }
        return id
      },
      acceptPatch,
      appendTerminalOutput: (lines) => {
        appendTerminalOutput(lines)
      },
      setTerminalBusy,
      markGitDirty,
      proposeGitCommit,
      readFileFromWorkspace,
      recordTerminalCommand: (command, exitCode) => {
        setLastTerminalCommand({ command, exitCode })
      },
    }
    setIdeTurnHost(host)
    return () => setIdeTurnHost(null)
  }, [
    workspaceRoot,
    activeFilePath,
    openFiles,
    pendingPatches,
    terminalLines,
    terminalBusy,
    gitDirtyPaths,
    lastTerminalCommand,
    proposePatch,
    acceptPatch,
    applyPatchToDisk,
    appendTerminalOutput,
    markGitDirty,
    proposeGitCommit,
    readFileFromWorkspace,
  ])

  const value = useMemo(
    (): LunaWorkspaceValue => ({
      workspaceRoot,
      openFiles,
      activeFilePath,
      pendingPatches,
      pendingGitCommit,
      terminalLines,
      terminalBusy,
      gitDirtyPaths,
      openFolder,
      openFile,
      setActiveFile,
      closeTab,
      updateTabContent,
      proposePatch,
      acceptPatch,
      rejectPatch,
      proposeGitCommit,
      acceptGitCommit,
      rejectGitCommit,
      appendTerminalOutput,
      clearTerminal,
      setTerminalBusy,
      markGitDirty,
      refreshActiveFromDisk,
      restoreWorkspaceCheckpoint,
    }),
    [
      workspaceRoot,
      openFiles,
      activeFilePath,
      pendingPatches,
      pendingGitCommit,
      terminalLines,
      terminalBusy,
      gitDirtyPaths,
      openFolder,
      openFile,
      setActiveFile,
      closeTab,
      updateTabContent,
      proposePatch,
      acceptPatch,
      rejectPatch,
      proposeGitCommit,
      acceptGitCommit,
      rejectGitCommit,
      appendTerminalOutput,
      clearTerminal,
      markGitDirty,
      refreshActiveFromDisk,
      restoreWorkspaceCheckpoint,
    ],
  )

  return (
    <LunaWorkspaceContext.Provider value={value}>
      {children}
    </LunaWorkspaceContext.Provider>
  )
}

export function useLunaWorkspace(): LunaWorkspaceValue {
  const ctx = useContext(LunaWorkspaceContext)
  if (!ctx) {
    throw new Error('useLunaWorkspace must be used within LunaWorkspaceProvider')
  }
  return ctx
}

export function useLunaWorkspaceOptional(): LunaWorkspaceValue | null {
  return useContext(LunaWorkspaceContext)
}
