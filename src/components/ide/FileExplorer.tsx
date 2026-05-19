import { useCallback, useEffect, useState } from 'react'
import { bridgeAgentListDirectory } from '../../lib/lunaBridge'
import { joinPath } from '../../lib/pathJoin'
import { useLunaWorkspace } from '../../context/LunaWorkspaceContext'
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
}

function isDirectoryEntry(type: string): boolean {
  return type === 'directory' || type === 'dir'
}

function basename(p: string): string {
  const parts = p.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || p
}

export function FileExplorer() {
  const ws = useLunaWorkspace()
  const [root, setRoot] = useState<TreeNode | null>(null)

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

  useEffect(() => {
    if (!ws.workspaceRoot) {
      setRoot(null)
      return
    }
    let cancelled = false
    void (async () => {
      const children = await loadDir(ws.workspaceRoot!)
      if (cancelled) return
      setRoot({
        name: basename(ws.workspaceRoot!),
        path: ws.workspaceRoot!,
        type: 'directory',
        children,
        expanded: true,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [ws.workspaceRoot, loadDir])

  const toggleDir = async (node: TreeNode) => {
    if (node.type !== 'directory') return
    if (node.expanded) {
      setRoot((prev) => updateNode(prev, node.path, { expanded: false }))
      return
    }
    if (!node.children?.length) {
      setRoot((prev) => updateNode(prev, node.path, { loading: true, expanded: true }))
      const children = await loadDir(node.path)
      setRoot((prev) =>
        updateNode(prev, node.path, { loading: false, expanded: true, children }),
      )
    } else {
      setRoot((prev) => updateNode(prev, node.path, { expanded: true }))
    }
  }

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-line px-2 py-1.5">
        <span className="text-[11px] font-medium text-fg-dim">Explorador</span>
        <button
          type="button"
          onClick={() => void ws.openFolder()}
          className="rounded px-1.5 py-0.5 text-[10px] text-accent hover:bg-white/[0.06]"
        >
          Abrir pasta
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-1 text-[11px]">
        {!ws.workspaceRoot ? (
          <p className="px-2 py-4 text-center text-fg-muted">
            Abre uma pasta de projecto para começar.
          </p>
        ) : root ? (
          <TreeList
            node={root}
            depth={0}
            activePath={ws.activeFilePath}
            dirtyPaths={ws.gitDirtyPaths}
            onFileClick={(p) => void ws.openFile(p)}
            onDirClick={(n) => void toggleDir(n)}
          />
        ) : (
          <p className="px-2 text-fg-muted">A carregar…</p>
        )}
      </div>
      <WorkspaceCheckpointsPanel />
    </div>
  )
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

function TreeList({
  node,
  depth,
  activePath,
  dirtyPaths,
  onFileClick,
  onDirClick,
}: {
  node: TreeNode
  depth: number
  activePath: string | null
  dirtyPaths: Set<string>
  onFileClick: (path: string) => void
  onDirClick: (node: TreeNode) => void
}) {
  const pad = { paddingLeft: `${depth * 12 + 8}px` }
  if (node.type === 'file') {
    const active = node.path === activePath
    const dirty = dirtyPaths.has(node.path)
    return (
      <button
        type="button"
        style={pad}
        onClick={() => onFileClick(node.path)}
        className={`flex w-full items-center gap-1 truncate py-0.5 pr-2 text-left hover:bg-white/[0.05] ${
          active ? 'bg-white/[0.08] text-fg' : 'text-fg-dim'
        }`}
      >
        <span className="text-fg-muted">📄</span>
        <span className="truncate">{node.name}</span>
        {dirty ? (
          <span className="ml-auto text-[9px] text-amber-400">●</span>
        ) : null}
      </button>
    )
  }
  return (
    <div>
      <button
        type="button"
        style={pad}
        onClick={() => onDirClick(node)}
        className="flex w-full items-center gap-1 truncate py-0.5 pr-2 text-left text-fg-dim hover:bg-white/[0.05]"
      >
        <span className="text-[10px] text-fg-muted">{node.expanded ? '▼' : '▶'}</span>
        <span className="truncate font-medium">{node.name}</span>
        {node.loading ? (
          <span className="ml-1 text-[9px] text-fg-muted">…</span>
        ) : null}
      </button>
      {node.expanded && node.children
        ? node.children.map((c) => (
            <TreeList
              key={c.path}
              node={c}
              depth={depth + 1}
              activePath={activePath}
              dirtyPaths={dirtyPaths}
              onFileClick={onFileClick}
              onDirClick={onDirClick}
            />
          ))
        : null}
    </div>
  )
}
