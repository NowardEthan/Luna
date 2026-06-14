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
  bridgeAgentSetWorkspaceRoots,
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
import { requestConfirm } from '../lib/confirm'
import { runFormatOnDisk } from '../lib/forgeFormat'
import { clearAllDiagnostics, clearFileDiagnostics } from '../lib/forgeDiagnosticsStore'
import i18n from '../i18n'
import { showToast } from '../lib/toast'
import { scheduleWorkspaceRagSync } from '../lib/workspaceRagSync'
import { syncForgeLspWorkspace } from '../lib/forgeLspClient'
import {
  appendForgeOutput,
  clearForgeOutput,
} from '../lib/forgeOutputStore'
import {
  clearTabBuffers,
  deleteTabBuffer,
  getTabBuffer,
  setTabBuffer,
} from '../lib/workspaceTabBuffers'
import { eventBus } from '../core/events/EventBus'
import {
  configFromPaths,
  folderPaths,
  loadWorkspaceConfig,
  pathBelongsToFolder,
  primaryPath,
  saveWorkspaceConfig,
  type WorkspaceConfig,
} from '../lib/workspaceConfig'

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
  workspaceFolders: string[]
  openFiles: OpenFileTab[]
  activeFilePath: string | null
  /** Incrementa quando conteúdo vem do disco/agente (não do teclado). */
  externalContentRevision: number
  getTabContent: (path: string) => string | undefined
  pendingPatches: PatchProposal[]
  pendingGitCommit: GitCommitProposal | null
  terminalLines: TerminalLine[]
  terminalBusy: boolean
  gitDirtyPaths: Set<string>
  openFolder: () => Promise<void>
  /** Adiciona uma pasta ao workspace multi-root. */
  addFolderToWorkspace: () => Promise<void>
  /** Remove uma pasta do workspace (fecha tabs dessa raiz). */
  removeFolderFromWorkspace: (path: string) => void
  /** Abre workspace por path (ex.: projectos recentes). */
  openWorkspacePath: (path: string) => Promise<void>
  /** Fecha o projecto activo e volta ao ecrã inicial do Forge. */
  closeWorkspace: () => void
  openFile: (path: string) => Promise<boolean>
  setActiveFile: (path: string) => void
  closeTab: (path: string, opts?: { force?: boolean }) => Promise<boolean>
  saveActiveFile: () => Promise<boolean>
  saveAllDirtyFiles: () => Promise<boolean>
  formatActiveFile: () => Promise<boolean>
  reloadFileFromDisk: (path: string) => Promise<boolean>
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
  const [workspaceConfig, setWorkspaceConfig] = useState<WorkspaceConfig | null>(
    () => loadWorkspaceConfig(),
  )
  const workspaceFolders = useMemo(
    () => folderPaths(workspaceConfig),
    [workspaceConfig],
  )
  const workspaceRoot = useMemo(
    () => primaryPath(workspaceConfig),
    [workspaceConfig],
  )
  const [openFiles, setOpenFiles] = useState<OpenFileTab[]>([])
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null)
  const [externalContentRevision, setExternalContentRevision] = useState(0)
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
    key: string
    promise: Promise<boolean> | null
  }>({ key: '', promise: null })

  const hostStateRef = useRef({
    workspaceRoot: null as string | null,
    workspaceFolders: [] as string[],
    activeFilePath: null as string | null,
    openFiles: [] as OpenFileTab[],
    pendingPatches: [] as PatchProposal[],
    terminalLines: [] as TerminalLine[],
    terminalBusy: false,
    gitDirtyPaths: new Set<string>(),
    lastTerminalCommand: null as { command: string; exitCode?: number } | null,
  })

  const applyExternalTabContent = useCallback(
    (path: string, content: string, dirty: boolean) => {
      setTabBuffer(path, content)
      setOpenFiles((prev) =>
        prev.map((f) =>
          f.path === path ? { ...f, content, dirty } : f,
        ),
      )
      if (!dirty) {
        setExternalContentRevision((n) => n + 1)
      }
    },
    [],
  )

  const getTabContent = useCallback((path: string): string | undefined => {
    return getTabBuffer(path)
  }, [])

  const ensureWorkspaceOnServer = useCallback(
    async (folders: string[]): Promise<boolean> => {
      if (!folders.length) return false
      const key = folders.join('\0')
      const cached = workspaceSyncRef.current
      if (cached.key === key && cached.promise) {
        return cached.promise
      }
      const promise = bridgeAgentSetWorkspaceRoots(folders).then(
        (r) => r.ok !== false,
      )
      workspaceSyncRef.current = { key, promise }
      return promise
    },
    [],
  )

  useEffect(() => {
    if (!workspaceFolders.length) {
      workspaceSyncRef.current = { key: '', promise: null }
      return
    }
    saveWorkspaceConfig(workspaceConfig)
    void ensureWorkspaceOnServer(workspaceFolders)
    void syncForgeLspWorkspace(workspaceRoot)
  }, [workspaceConfig, workspaceFolders, workspaceRoot, ensureWorkspaceOnServer])

  const openFile = useCallback(async (path: string): Promise<boolean> => {
    if (!path?.trim() || !workspaceFolders.length) return false
    const ready = await ensureWorkspaceOnServer(workspaceFolders)
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
    setTabBuffer(path, r.content)
    setOpenFiles((prev) => [...prev.filter((f) => f.path !== path), tab])
    setActiveFilePath(path)
    return true
  }, [openFiles, workspaceFolders, ensureWorkspaceOnServer])

  const activateWorkspace = useCallback(
    async (paths: string | string[]) => {
      const list = Array.isArray(paths) ? paths : [paths]
      const config = configFromPaths(list)
      if (!config) return
      workspaceSyncRef.current = { key: '', promise: null }
      setWorkspaceConfig(config)
      setOpenFiles([])
      setActiveFilePath(null)
      setPendingPatches([])
      clearTabBuffers()
      setExternalContentRevision(0)
      await ensureWorkspaceOnServer(folderPaths(config))
    },
    [ensureWorkspaceOnServer],
  )

  const addFolderToWorkspace = useCallback(async () => {
    const picked = await ragPickFolder()
    if (picked.canceled || !picked.path) return
    const trimmed = picked.path.trim()
    if (!trimmed) return
    if (
      workspaceFolders.some(
        (f) => f.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      showToast(i18n.t('forge.workspace.folderAlreadyAdded'), 'info')
      return
    }
    const next = configFromPaths([...workspaceFolders, trimmed])
    if (!next) return
    workspaceSyncRef.current = { key: '', promise: null }
    setWorkspaceConfig(next)
    const ready = await ensureWorkspaceOnServer(folderPaths(next))
    if (!ready) {
      showToast(i18n.t('forge.workspace.syncFailed'), 'error')
      return
    }
    try {
      const autoIndex =
        globalThis.localStorage?.getItem('luna-ide-index-auto') !== '0'
      if (autoIndex) void ragIndexFolder(trimmed)
    } catch {
      /* ignore */
    }
    showToast(i18n.t('forge.workspace.folderAdded'), 'success')
  }, [workspaceFolders, ensureWorkspaceOnServer])

  const openFolder = useCallback(async () => {
    if (workspaceFolders.length) {
      await addFolderToWorkspace()
      return
    }
    const picked = await ragPickFolder()
    if (picked.canceled || !picked.path) return
    await activateWorkspace(picked.path)
    try {
      const autoIndex =
        globalThis.localStorage?.getItem('luna-ide-index-auto') !== '0'
      if (autoIndex) void ragIndexFolder(picked.path)
    } catch {
      /* ignore */
    }
  }, [workspaceFolders.length, addFolderToWorkspace, activateWorkspace])

  const removeFolderFromWorkspace = useCallback(
    (folderPath: string) => {
      const trimmed = folderPath.trim()
      if (!trimmed || workspaceFolders.length <= 1) return
      const nextFolders = workspaceFolders.filter(
        (f) => f.toLowerCase() !== trimmed.toLowerCase(),
      )
      if (nextFolders.length === workspaceFolders.length) return
      const next = configFromPaths(nextFolders)
      if (!next) return
      workspaceSyncRef.current = { key: '', promise: null }
      setWorkspaceConfig(next)
      setOpenFiles((prev) => {
        const kept = prev.filter(
          (f) => !pathBelongsToFolder(f.path, trimmed),
        )
        setActiveFilePath((cur) => {
          if (!cur || pathBelongsToFolder(cur, trimmed)) {
            return kept.length ? kept[kept.length - 1]!.path : null
          }
          return cur
        })
        for (const tab of prev) {
          if (pathBelongsToFolder(tab.path, trimmed)) {
            deleteTabBuffer(tab.path)
            clearFileDiagnostics(tab.path)
          }
        }
        return kept
      })
      void ensureWorkspaceOnServer(nextFolders)
    },
    [workspaceFolders, ensureWorkspaceOnServer],
  )

  const openWorkspacePath = useCallback(
    async (path: string) => {
      const trimmed = path.trim()
      if (!trimmed) return
      await activateWorkspace(trimmed)
    },
    [activateWorkspace],
  )

  const closeWorkspace = useCallback(() => {
    workspaceSyncRef.current = { key: '', promise: null }
    setWorkspaceConfig(null)
    saveWorkspaceConfig(null)
    setOpenFiles([])
    setActiveFilePath(null)
    setPendingPatches([])
    setPendingGitCommit(null)
    setTerminalLines([])
    setGitDirtyPaths(new Set())
    clearAllDiagnostics()
    clearTabBuffers()
    setExternalContentRevision(0)
    void bridgeAgentSetWorkspaceRoots([])
    void syncForgeLspWorkspace(null)
  }, [])

  const setActiveFile = useCallback((path: string) => {
    setActiveFilePath(path)
  }, [])

  const writeTabToDisk = useCallback(
    async (tab: OpenFileTab): Promise<boolean> => {
      if (workspaceFolders.length) {
        const ready = await ensureWorkspaceOnServer(workspaceFolders)
        if (!ready) {
          showToast(
            i18n.t('forge.editor.saveWorkspaceSyncFailed'),
            'error',
          )
          return false
        }
      }
      const content = getTabBuffer(tab.path) ?? tab.content
      const r = await bridgeAgentWriteFile(tab.path, content)
      if (!r.ok) {
        const err =
          r && typeof r === 'object' && 'error' in r && typeof r.error === 'string'
            ? r.error
            : i18n.t('forge.editor.saveFailed')
        showToast(err, 'error', 6000)
        return false
      }
      setTabBuffer(tab.path, content)
      setOpenFiles((prev) =>
        prev.map((f) =>
          f.path === tab.path ? { ...f, content, dirty: false } : f,
        ),
      )
      setGitDirtyPaths((s) => new Set(s).add(tab.path))
      scheduleWorkspaceRagSync([tab.path])
      return true
    },
    [workspaceFolders, ensureWorkspaceOnServer],
  )

  const closeTab = useCallback(
    async (path: string, opts?: { force?: boolean }): Promise<boolean> => {
      const tab = openFiles.find((f) => f.path === path)
      if (tab?.dirty && !opts?.force) {
        const name = path.replace(/\\/g, '/').split('/').pop() || path
        const ok = await requestConfirm({
          title: i18n.t('forge.editor.unsavedTitle'),
          message: i18n.t('forge.editor.unsavedClose', { name }),
          destructive: true,
        })
        if (!ok) return false
      }
      setOpenFiles((prev) => {
        const next = prev.filter((f) => f.path !== path)
        setActiveFilePath((cur) => {
          if (cur !== path) return cur
          return next.length ? next[next.length - 1]!.path : null
        })
        return next
      })
      deleteTabBuffer(path)
      clearFileDiagnostics(path)
      return true
    },
    [openFiles],
  )

  const saveActiveFile = useCallback(async (): Promise<boolean> => {
    if (!activeFilePath) return false
    const tab = openFiles.find((f) => f.path === activeFilePath)
    if (!tab) return false
    if (!tab.dirty) return true
    const ok = await writeTabToDisk(tab)
    if (ok) showToast(i18n.t('forge.editor.saved'), 'success')
    return ok
  }, [activeFilePath, openFiles, writeTabToDisk])

  const saveAllDirtyFiles = useCallback(async (): Promise<boolean> => {
    const dirty = openFiles.filter((f) => f.dirty)
    if (!dirty.length) return true
    let okCount = 0
    for (const tab of dirty) {
      if (await writeTabToDisk(tab)) okCount++
    }
    if (okCount === dirty.length) {
      showToast(
        i18n.t('forge.editor.savedAll', { count: okCount }),
        'success',
      )
      return true
    }
    if (okCount > 0) {
      showToast(
        i18n.t('forge.editor.savedPartial', {
          ok: okCount,
          total: dirty.length,
        }),
        'info',
      )
    }
    return okCount === dirty.length
  }, [openFiles, writeTabToDisk])

  const reloadFileFromDisk = useCallback(async (path: string): Promise<boolean> => {
    const r = await bridgeAgentReadFile(path)
    if (!r.ok || r.content === undefined) return false
    applyExternalTabContent(path, r.content, false)
    return true
  }, [applyExternalTabContent])

  const formatActiveFile = useCallback(async (): Promise<boolean> => {
    if (!activeFilePath) return false
    const tab = openFiles.find((f) => f.path === activeFilePath)
    if (!tab) return false
    if (tab.dirty) {
      const saved = await writeTabToDisk(tab)
      if (!saved) return false
    }
    const r = await runFormatOnDisk(
      activeFilePath,
      tab.languageId,
      workspaceRoot,
    )
    if (!r.ok) {
      showToast(r.error ?? i18n.t('forge.editor.formatFailed'), 'error', 6000)
      return false
    }
    await reloadFileFromDisk(activeFilePath)
    showToast(i18n.t('forge.editor.formatted'), 'success')
    return true
  }, [
    activeFilePath,
    openFiles,
    workspaceRoot,
    writeTabToDisk,
    reloadFileFromDisk,
  ])

  const updateTabContent = useCallback((path: string, content: string) => {
    setTabBuffer(path, content)
    setOpenFiles((prev) => {
      const tab = prev.find((f) => f.path === path)
      if (!tab || tab.dirty) return prev
      return prev.map((f) =>
        f.path === path ? { ...f, dirty: true } : f,
      )
    })
  }, [])

  const applyPatchToDisk = useCallback(
    async (p: PatchProposal): Promise<boolean> => {
      const diskPath = resolveWorkspaceFilePath(
        p.path,
        workspaceRoot,
        workspaceFolders,
      )
      if (!diskPath) {
        showToast('Caminho do ficheiro inválido.', 'error')
        return false
      }
      if (workspaceFolders.length) {
        const ready = await ensureWorkspaceOnServer(workspaceFolders)
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
      setTabBuffer(diskPath, p.newContent)
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
      setExternalContentRevision((n) => n + 1)
      setActiveFilePath(diskPath)
      setGitDirtyPaths((s) => new Set(s).add(diskPath))
      scheduleWorkspaceRagSync([diskPath])
      return true
    },
    [workspaceRoot, workspaceFolders, ensureWorkspaceOnServer],
  )

  const proposePatch = useCallback(
    (proposal: Omit<PatchProposal, 'id' | 'createdAt'>): string => {
      const id = nextProposalId()
      const path = resolveWorkspaceFilePath(
        proposal.path,
        workspaceRoot,
        workspaceFolders,
      )
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
    [workspaceRoot, workspaceFolders],
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
    for (const line of lines) {
      appendForgeOutput('agent', line.stream, line.text)
    }
    setTerminalLines((prev) => [...prev, ...lines].slice(-4000))
  }, [])

  const clearTerminal = useCallback(() => {
    clearForgeOutput('agent')
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
    applyExternalTabContent(activeFilePath, r.content, false)
  }, [activeFilePath, applyExternalTabContent])

  const restoreWorkspaceCheckpoint = useCallback(
    async (checkpoint: LunaCheckpoint): Promise<boolean> => {
      if (!checkpoint.files.length) {
        showToast('Checkpoint sem ficheiros para restaurar.', 'error')
        return false
      }
      if (workspaceFolders.length) {
        const ready = await ensureWorkspaceOnServer(workspaceFolders)
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
          setTabBuffer(file.path, file.content)
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
      setExternalContentRevision((n) => n + 1)
      showToast(
        `Restaurado: ${okCount} ficheiro(s) do estado anterior.`,
        'success',
      )
      return true
    },
    [workspaceFolders, ensureWorkspaceOnServer],
  )

  const readFileFromWorkspace = useCallback(
    async (path: string, maxChars?: number) => {
      const tab = openFiles.find((f) => f.path === path)
      if (tab) {
        const raw = getTabBuffer(path) ?? tab.content
        const content = maxChars ? raw.slice(0, maxChars) : raw
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

  hostStateRef.current = {
    workspaceRoot,
    workspaceFolders,
    activeFilePath,
    openFiles,
    pendingPatches,
    terminalLines,
    terminalBusy,
    gitDirtyPaths,
    lastTerminalCommand,
  }

  const acceptPatchRef = useRef(acceptPatch)
  acceptPatchRef.current = acceptPatch
  const applyPatchToDiskRef = useRef(applyPatchToDisk)
  applyPatchToDiskRef.current = applyPatchToDisk
  const appendTerminalOutputRef = useRef(appendTerminalOutput)
  appendTerminalOutputRef.current = appendTerminalOutput
  const markGitDirtyRef = useRef(markGitDirty)
  markGitDirtyRef.current = markGitDirty
  const proposeGitCommitRef = useRef(proposeGitCommit)
  proposeGitCommitRef.current = proposeGitCommit
  const readFileFromWorkspaceRef = useRef(readFileFromWorkspace)
  readFileFromWorkspaceRef.current = readFileFromWorkspace

  useEffect(() => {
    const host: IdeTurnHost = {
      getSnapshot: () => {
        const s = hostStateRef.current
        return {
          workspaceRoot: s.workspaceRoot,
          workspaceFolders: s.workspaceFolders,
          activeFilePath: s.activeFilePath,
          openFiles: s.openFiles.map((f) => ({
            ...f,
            content: getTabBuffer(f.path) ?? f.content,
          })),
          pendingPatches: s.pendingPatches,
          terminalLines: s.terminalLines,
          terminalBusy: s.terminalBusy,
          gitDirtyPaths: [...s.gitDirtyPaths],
          lastTerminalCommand: s.lastTerminalCommand ?? undefined,
        }
      },
      proposePatch: (proposal) => {
        const id = nextProposalId()
        const path = resolveWorkspaceFilePath(
          proposal.path,
          hostStateRef.current.workspaceRoot,
          hostStateRef.current.workspaceFolders,
        )
        const p: PatchProposal = {
          ...proposal,
          path,
          id,
          createdAt: Date.now(),
        }
        setPendingPatches((prev) => [p, ...prev])
        if (readIdeAutoApply()) {
          void (async () => {
            const ok = await applyPatchToDiskRef.current(p)
            if (!ok) return
            setPendingPatches((prev) => prev.filter((x) => x.id !== id))
          })()
        }
        return id
      },
      acceptPatch: (id) => acceptPatchRef.current(id),
      appendTerminalOutput: (lines) => {
        appendTerminalOutputRef.current(lines)
      },
      setTerminalBusy,
      markGitDirty: (paths) => markGitDirtyRef.current(paths),
      proposeGitCommit: (message) => proposeGitCommitRef.current(message),
      readFileFromWorkspace: (path, maxChars) =>
        readFileFromWorkspaceRef.current(path, maxChars),
      recordTerminalCommand: (command, exitCode) => {
        setLastTerminalCommand({ command, exitCode })
      },
    }
    setIdeTurnHost(host)
    return () => setIdeTurnHost(null)
  }, [setTerminalBusy])

  const value = useMemo(
    (): LunaWorkspaceValue => ({
      workspaceRoot,
      workspaceFolders,
      openFiles,
      activeFilePath,
      externalContentRevision,
      getTabContent,
      pendingPatches,
      pendingGitCommit,
      terminalLines,
      terminalBusy,
      gitDirtyPaths,
      openFolder,
      addFolderToWorkspace,
      removeFolderFromWorkspace,
      openWorkspacePath,
      closeWorkspace,
      openFile,
      setActiveFile,
      closeTab,
      saveActiveFile,
      saveAllDirtyFiles,
      formatActiveFile,
      reloadFileFromDisk,
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
      workspaceFolders,
      openFiles,
      activeFilePath,
      externalContentRevision,
      getTabContent,
      pendingPatches,
      pendingGitCommit,
      terminalLines,
      terminalBusy,
      gitDirtyPaths,
      openFolder,
      addFolderToWorkspace,
      removeFolderFromWorkspace,
      openWorkspacePath,
      closeWorkspace,
      openFile,
      setActiveFile,
      closeTab,
      saveActiveFile,
      saveAllDirtyFiles,
      formatActiveFile,
      reloadFileFromDisk,
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
