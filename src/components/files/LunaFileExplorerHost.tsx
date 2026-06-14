import { useEffect, useState } from 'react'
import {
  cancelLunaFileExplorerPrompt,
  resolveLunaFileExplorerFiles,
  resolveLunaFileExplorerPaths,
  subscribeLunaFileExplorerHost,
  type LunaFileExplorerHostState,
} from '../../lib/lunaFileExplorerPrompt'
import { LunaFileExplorerModal } from './LunaFileExplorerModal'

const empty: LunaFileExplorerHostState = { open: false, request: null }

export function LunaFileExplorerHost() {
  const [host, setHost] = useState<LunaFileExplorerHostState>(empty)

  useEffect(() => subscribeLunaFileExplorerHost(setHost), [])

  const req = host.request
  if (!host.open || !req) return null

  const title =
    req.kind === 'folder'
      ? (req.options.title ?? 'Selecionar pasta')
      : req.options.title

  const confirmLabel =
    req.options.confirmLabel ??
    (req.kind === 'folder'
      ? 'Usar esta pasta'
      : req.kind === 'paths'
        ? 'Selecionar'
        : 'Usar este arquivo')

  const selectionMode =
    req.kind === 'folder' ? 'folder' : req.kind === 'paths' ? 'paths' : 'files'

  const multiple =
    req.kind === 'files' || req.kind === 'paths'
      ? Boolean(req.options.multiple)
      : false

  const accept =
    req.kind === 'files' || req.kind === 'paths' ? req.options.accept : undefined

  return (
    <LunaFileExplorerModal
      open
      title={title}
      confirmLabel={confirmLabel}
      accept={accept}
      multiple={multiple}
      initialPath={
        req.kind === 'folder' ? req.options.initialPath : req.options.initialPath
      }
      selectionMode={selectionMode}
      onClose={cancelLunaFileExplorerPrompt}
      onConfirm={(files) => resolveLunaFileExplorerFiles(files)}
      onConfirmPaths={(paths) => resolveLunaFileExplorerPaths(paths)}
    />
  )
}
