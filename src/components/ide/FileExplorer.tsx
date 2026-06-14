import { useCallback, useEffect, useState, type MouseEvent } from 'react'

import { useTranslation } from 'react-i18next'

import { bridgeAgentListDirectory } from '../../lib/lunaBridge'

import { joinPath } from '../../lib/pathJoin'

import { useLunaWorkspace } from '../../context/LunaWorkspaceContext'

import {

  forgeCreateFile,

  forgeCreateFolder,

  forgeDeletePath,

  forgeRenamePath,

} from '../../lib/forgeFileOps'

import { requestConfirm } from '../../lib/confirm'
import { WorkspaceCheckpointsPanel } from './WorkspaceCheckpointsPanel'



const SKIP = new Set([

  'node_modules',

  '.git',

  'dist',

  'build',

  '.next',

  'coverage',

])



type TreeNode = {

  name: string

  path: string

  type: 'file' | 'directory'

  children?: TreeNode[]

  loading?: boolean

  expanded?: boolean

  isWorkspaceRoot?: boolean

}



type ContextMenuState = {

  x: number

  y: number

  node: TreeNode

} | null



function isDirectoryEntry(type: string): boolean {

  return type === 'directory' || type === 'dir'

}



function basename(p: string): string {

  const parts = p.replace(/\\/g, '/').split('/')

  return parts[parts.length - 1] || p

}



function updateNode(

  root: TreeNode | null,

  path: string,

  patch: Partial<TreeNode>,

): TreeNode | null {

  if (!root) return root

  if (root.path === path) return { ...root, ...patch }

  if (!root.children) return root

  return {

    ...root,

    children: root.children.map((c) => {

      const u = updateNode(c, path, patch)

      return u ?? c

    }),

  }

}



function updateForest(

  roots: TreeNode[],

  path: string,

  patch: Partial<TreeNode>,

): TreeNode[] {

  return roots.map((r) => updateNode(r, path, patch) ?? r)

}



export function FileExplorer() {

  const { t } = useTranslation()

  const ws = useLunaWorkspace()

  const [roots, setRoots] = useState<TreeNode[]>([])

  const [refreshKey, setRefreshKey] = useState(0)

  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null)



  const loadDir = useCallback(async (dirPath: string): Promise<TreeNode[]> => {

    const r = await bridgeAgentListDirectory(dirPath)

    if (!r.ok || !r.entries) return []

    return r.entries

      .filter((e) => !SKIP.has(e.name))

      .sort((a, b) => {

        const aDir = isDirectoryEntry(a.type)

        const bDir = isDirectoryEntry(b.type)

        if (aDir !== bDir) return aDir ? -1 : 1

        return a.name.localeCompare(b.name)

      })

      .map((e) => {

        const isDir = isDirectoryEntry(e.type)

        return {

          name: e.name,

          path: e.path ?? joinPath(dirPath, e.name),

          type: isDir ? ('directory' as const) : ('file' as const),

        }

      })

  }, [])



  const reloadRoot = useCallback(() => {

    setRefreshKey((k) => k + 1)

  }, [])



  useEffect(() => {

    if (!ws.workspaceFolders.length) {

      setRoots([])

      return

    }

    let cancelled = false

    void (async () => {

      const nodes = await Promise.all(

        ws.workspaceFolders.map(async (folderPath) => {

          const children = await loadDir(folderPath)

          return {

            name: basename(folderPath),

            path: folderPath,

            type: 'directory' as const,

            children,

            expanded: true,

            isWorkspaceRoot: true,

          }

        }),

      )

      if (cancelled) return

      setRoots(nodes)

    })()

    return () => {

      cancelled = true

    }

  }, [ws.workspaceFolders, loadDir, refreshKey])



  const toggleDir = async (node: TreeNode) => {

    if (node.type !== 'directory') return

    if (node.expanded) {

      setRoots((prev) => updateForest(prev, node.path, { expanded: false }))

      return

    }

    if (!node.children?.length) {

      setRoots((prev) =>

        updateForest(prev, node.path, { loading: true, expanded: true }),

      )

      const children = await loadDir(node.path)

      setRoots((prev) =>

        updateForest(prev, node.path, {

          loading: false,

          expanded: true,

          children,

        }),

      )

    } else {

      setRoots((prev) => updateForest(prev, node.path, { expanded: true }))

    }

  }



  const promptName = (title: string) => window.prompt(title)

  const parentDirFor = (node: TreeNode) =>

    node.type === 'directory' ? node.path : node.path.replace(/[/\\][^/\\]+$/, '')



  const handleNewFile = async (node?: TreeNode) => {

    const parent = node

      ? parentDirFor(node)

      : ws.workspaceRoot

    if (!parent) return

    const name = promptName(t('forge.explorer.newFilePrompt'))

    if (!name) return

    const r = await forgeCreateFile(parent, name)

    if (r.ok) {

      reloadRoot()

      void ws.openFile(joinPath(parent, name.trim()))

    }

  }



  const handleNewFolder = async (node?: TreeNode) => {

    const parent = node

      ? parentDirFor(node)

      : ws.workspaceRoot

    if (!parent) return

    const name = promptName(t('forge.explorer.newFolderPrompt'))

    if (!name) return

    const r = await forgeCreateFolder(parent, name)

    if (r.ok) reloadRoot()

  }



  const handleRename = async (node: TreeNode) => {

    const name = promptName(t('forge.explorer.renamePrompt'))

    if (!name) return

    const r = await forgeRenamePath(node.path, name)

    if (r.ok) reloadRoot()

  }



  const handleDelete = async (node: TreeNode) => {

    if (!window.confirm(t('forge.explorer.deleteConfirm', { name: node.name }))) return

    const r = await forgeDeletePath(node.path)

    if (r.ok) {

      void ws.closeTab(node.path, { force: true })

      reloadRoot()

    }

  }



  const handleRemoveWorkspaceFolder = async (node: TreeNode) => {
    if (!node.isWorkspaceRoot || ws.workspaceFolders.length <= 1) return
    const ok = await requestConfirm({
      title: t('forge.workspace.removeFolderTitle'),
      message: t('forge.workspace.removeFolderConfirm', { name: node.name }),
      confirmLabel: t('forge.workspace.removeFolder'),
      destructive: true,
    })
    if (!ok) return
    ws.removeFolderFromWorkspace(node.path)
    reloadRoot()
  }



  const primaryRoot = ws.workspaceRoot



  return (

    <div className="flex h-full flex-col">

      <div className="flex shrink-0 items-center gap-0.5 border-b border-line-subtle px-2 py-1">

        <button

          type="button"

          title={t('forge.explorer.newFile')}

          onClick={() => void handleNewFile()}

          className="luna-btn-ghost rounded p-1 text-fg-muted hover:text-fg"

        >

          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="stroke-current" strokeWidth="2" aria-hidden>

            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />

            <path d="M12 18v-6M9 15h6" />

          </svg>

        </button>

        <button

          type="button"

          title={t('forge.explorer.newFolder')}

          onClick={() => void handleNewFolder()}

          className="luna-btn-ghost rounded p-1 text-fg-muted hover:text-fg"

        >

          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="stroke-current" strokeWidth="2" aria-hidden>

            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />

            <path d="M12 10v6M9 13h6" />

          </svg>

        </button>

        <button

          type="button"

          title={t('forge.workspace.addFolder')}

          onClick={() => void ws.addFolderToWorkspace()}

          className="luna-btn-ghost rounded p-1 text-fg-muted hover:text-fg"

        >

          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="stroke-current" strokeWidth="2" aria-hidden>

            <path d="M12 5v14M5 12h14" />

          </svg>

        </button>

        <button

          type="button"

          title={t('forge.explorer.refresh')}

          onClick={reloadRoot}

          className="luna-btn-ghost ml-auto rounded p-1 text-fg-muted hover:text-fg"

        >

          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="stroke-current" strokeWidth="2" aria-hidden>

            <path d="M21 12a9 9 0 1 1-3-6.7" />

            <path d="M21 3v6h-6" />

          </svg>

        </button>

      </div>



      <div className="min-h-0 flex-1 overflow-y-auto py-1 text-[11px]">

        {!ws.workspaceFolders.length ? (

          <p className="px-2 py-4 text-center text-fg-muted">{t('ide.explorer.empty')}</p>

        ) : roots.length ? (

          roots.map((root) => (

            <TreeList

              key={root.path}

              node={root}

              depth={0}

              primaryRoot={primaryRoot}

              activePath={ws.activeFilePath}

              dirtyPaths={ws.gitDirtyPaths}

              onFileClick={(p) => void ws.openFile(p)}

              onDirClick={(n) => void toggleDir(n)}

              onContextMenu={(e, n) => {

                e.preventDefault()

                setContextMenu({ x: e.clientX, y: e.clientY, node: n })

              }}

            />

          ))

        ) : (

          <p className="px-2 text-fg-muted">{t('ide.explorer.loading')}</p>

        )}

      </div>



      <WorkspaceCheckpointsPanel />



      {contextMenu ? (

        <>

          <button

            type="button"

            className="fixed inset-0 z-40 cursor-default"

            aria-label={t('forge.explorer.closeMenu')}

            onClick={() => setContextMenu(null)}

          />

          <menu

            className="luna-surface-panel fixed z-50 min-w-[10rem] rounded-lg border border-line py-1 shadow-lg"

            style={{ left: contextMenu.x, top: contextMenu.y }}

          >

            {contextMenu.node.isWorkspaceRoot &&

            ws.workspaceFolders.length > 1 ? (

              <li>

                <button

                  type="button"

                  className="luna-hover-row w-full px-3 py-1.5 text-left text-[11px] text-danger"

                  onClick={() => {

                    setContextMenu(null)

                    void handleRemoveWorkspaceFolder(contextMenu.node)

                  }}

                >

                  {t('forge.workspace.removeFolder')}

                </button>

              </li>

            ) : null}

            {!contextMenu.node.isWorkspaceRoot ? (

              <>

                <li>

                  <button type="button" className="luna-hover-row w-full px-3 py-1.5 text-left text-[11px]" onClick={() => { setContextMenu(null); void handleNewFile(contextMenu.node) }}>

                    {t('forge.explorer.newFile')}

                  </button>

                </li>

                <li>

                  <button type="button" className="luna-hover-row w-full px-3 py-1.5 text-left text-[11px]" onClick={() => { setContextMenu(null); void handleNewFolder(contextMenu.node) }}>

                    {t('forge.explorer.newFolder')}

                  </button>

                </li>

                <li>

                  <button type="button" className="luna-hover-row w-full px-3 py-1.5 text-left text-[11px]" onClick={() => { setContextMenu(null); void handleRename(contextMenu.node) }}>

                    {t('forge.explorer.rename')}

                  </button>

                </li>

                <li>

                  <button type="button" className="luna-hover-row w-full px-3 py-1.5 text-left text-[11px] text-danger" onClick={() => { setContextMenu(null); void handleDelete(contextMenu.node) }}>

                    {t('forge.explorer.delete')}

                  </button>

                </li>

              </>

            ) : (

              <>

                <li>

                  <button type="button" className="luna-hover-row w-full px-3 py-1.5 text-left text-[11px]" onClick={() => { setContextMenu(null); void handleNewFile(contextMenu.node) }}>

                    {t('forge.explorer.newFile')}

                  </button>

                </li>

                <li>

                  <button type="button" className="luna-hover-row w-full px-3 py-1.5 text-left text-[11px]" onClick={() => { setContextMenu(null); void handleNewFolder(contextMenu.node) }}>

                    {t('forge.explorer.newFolder')}

                  </button>

                </li>

              </>

            )}

          </menu>

        </>

      ) : null}

    </div>

  )

}



function TreeList({

  node,

  depth,

  primaryRoot,

  activePath,

  dirtyPaths,

  onFileClick,

  onDirClick,

  onContextMenu,

}: {

  node: TreeNode

  depth: number

  primaryRoot: string | null

  activePath: string | null

  dirtyPaths: Set<string>

  onFileClick: (path: string) => void

  onDirClick: (node: TreeNode) => void

  onContextMenu: (e: MouseEvent, node: TreeNode) => void

}) {

  const { t } = useTranslation()

  const pad = { paddingLeft: `${depth * 12 + 8}px` }

  if (node.type === 'file') {

    const active = node.path === activePath

    const dirty = dirtyPaths.has(node.path)

    return (

      <button

        type="button"

        style={pad}

        onClick={() => onFileClick(node.path)}

        onContextMenu={(e) => onContextMenu(e, node)}

        className={`flex w-full items-center gap-1 truncate py-0.5 pr-2 text-left hover:bg-white/[0.05] ${

          active ? 'bg-white/[0.08] text-fg' : 'text-fg-dim'

        }`}

      >

        <span className="text-fg-muted opacity-70">◇</span>

        <span className="truncate">{node.name}</span>

        {dirty ? <span className="ml-auto text-[9px] text-warning">●</span> : null}

      </button>

    )

  }

  const isPrimary =

    node.isWorkspaceRoot &&

    primaryRoot &&

    node.path.toLowerCase() === primaryRoot.toLowerCase()

  return (

    <div>

      <button

        type="button"

        style={pad}

        onClick={() => onDirClick(node)}

        onContextMenu={(e) => onContextMenu(e, node)}

        className="luna-hover-row flex w-full items-center gap-1 truncate py-0.5 pr-2 text-left text-fg-dim"

        title={node.isWorkspaceRoot ? node.path : undefined}

      >

        <span className="text-[10px] text-fg-muted">{node.expanded ? '▼' : '▶'}</span>

        <span className="truncate font-medium">{node.name}</span>

        {isPrimary ? (

          <span className="shrink-0 text-[8px] uppercase tracking-wide text-accent">

            {t('forge.workspace.primary')}

          </span>

        ) : null}

        {node.loading ? <span className="ml-1 text-[9px] text-fg-muted">…</span> : null}

      </button>

      {node.expanded && node.children

        ? node.children.map((c) => (

            <TreeList

              key={c.path}

              node={c}

              depth={depth + 1}

              primaryRoot={primaryRoot}

              activePath={activePath}

              dirtyPaths={dirtyPaths}

              onFileClick={onFileClick}

              onDirClick={onDirClick}

              onContextMenu={onContextMenu}

            />

          ))

        : null}

    </div>

  )

}


