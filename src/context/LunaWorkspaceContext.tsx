import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
import { saveCheckpoint } from '../lib/lunaCheckpoint'

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

  useEffect(() => {
    if (!workspaceRoot) return
    void bridgeAgentSetWorkspaceRoot(workspaceRoot)
    try {
      localStorage.setItem(WORKSPACE_ROOT_KEY, workspaceRoot)
    } catch {
      /* ignore */
    }
  }, [workspaceRoot])

  const openFile = useCallback(async (path: string): Promise<boolean> => {
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
  }, [openFiles])

  const openFolder = useCallback(async () => {
    const picked = await ragPickFolder()
    if (picked.canceled || !picked.path) return
    setWorkspaceRoot(picked.path)
    setOpenFiles([])
    setActiveFilePath(null)
    setPendingPatches([])
    await bridgeAgentSetWorkspaceRoot(picked.path)
    try {
      const autoIndex =
        globalThis.localStorage?.getItem('luna-ide-index-auto') !== '0'
      if (autoIndex) void ragIndexFolder(picked.path)
    } catch {
      /* ignore */
    }
  }, [])

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

  const proposePatch = useCallback(
    (proposal: Omit<PatchProposal, 'id' | 'createdAt'>): string => {
      const id = nextProposalId()
      setPendingPatches((prev) => [
        {
          ...proposal,
          id,
          createdAt: Date.now(),
        },
        ...prev,
      ])
      return id
    },
    [],
  )

  const acceptPatch = useCallback(async (id: string): Promise<boolean> => {
    const p = pendingPatches.find((x) => x.id === id)
    if (!p) return false
    saveCheckpoint({
      id: `cp-${Date.now()}`,
      convId: 'workspace',
      createdAt: Date.now(),
      label: p.summary,
      files: [{ path: p.path, content: p.oldContent }],
    })
    const r = await bridgeAgentWriteFile(p.path, p.newContent)
    if (!r.ok) return false
    setPendingPatches((prev) => prev.filter((x) => x.id !== id))
    setOpenFiles((prev) => {
      const idx = prev.findIndex((f) => f.path === p.path)
      if (idx === -1) {
        return [
          ...prev,
          {
            path: p.path,
            content: p.newContent,
            dirty: false,
            languageId: languageIdFromPath(p.path),
          },
        ]
      }
      return prev.map((f) =>
        f.path === p.path
          ? { ...f, content: p.newContent, dirty: false }
          : f,
      )
    })
    setActiveFilePath(p.path)
    setGitDirtyPaths((s) => new Set(s).add(p.path))
    return true
  }, [pendingPatches])

  const rejectPatch = useCallback((id: string) => {
    setPendingPatches((prev) => prev.filter((x) => x.id !== id))
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
        setPendingPatches((prev) => [
          { ...proposal, id, createdAt: Date.now() },
          ...prev,
        ])
        if (readIdeAutoApply()) {
          void (async () => {
            const p = { ...proposal, id, createdAt: Date.now() }
            saveCheckpoint({
              id: `cp-${Date.now()}`,
              convId: 'workspace',
              createdAt: Date.now(),
              label: p.summary,
              files: [{ path: p.path, content: p.oldContent }],
            })
            const r = await bridgeAgentWriteFile(p.path, p.newContent)
            if (!r.ok) return
            setPendingPatches((prev) => prev.filter((x) => x.id !== id))
            setOpenFiles((prev) => {
              const idx = prev.findIndex((f) => f.path === p.path)
              if (idx === -1) {
                return [
                  ...prev,
                  {
                    path: p.path,
                    content: p.newContent,
                    dirty: false,
                    languageId: languageIdFromPath(p.path),
                  },
                ]
              }
              return prev.map((f) =>
                f.path === p.path
                  ? { ...f, content: p.newContent, dirty: false }
                  : f,
              )
            })
            setActiveFilePath(p.path)
            setGitDirtyPaths((s) => new Set(s).add(p.path))
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
