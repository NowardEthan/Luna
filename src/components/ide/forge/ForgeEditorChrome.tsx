import { useTranslation } from 'react-i18next'
import { useForgeLayout } from '../../../context/ForgeLayoutContext'
import { useLunaWorkspace } from '../../../context/LunaWorkspaceContext'
import { lunaForgeTabClass } from '../../../lib/lunaVisual'

function basename(p: string): string {
  const parts = p.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || p
}

function dirname(p: string): string {
  const parts = p.replace(/\\/g, '/').split('/')
  parts.pop()
  return parts.join('/') || '/'
}

type Props = {
  children: React.ReactNode
}

/** Chrome do editor: tabs estilo Cursor + breadcrumbs. */
export function ForgeEditorChrome({ children }: Props) {
  const { t } = useTranslation()
  const ws = useLunaWorkspace()
  const forge = useForgeLayout()
  const activePath =
    forge.editorSplit && forge.focusPane === 'secondary'
      ? forge.splitFilePath ?? ws.activeFilePath
      : ws.activeFilePath
  const active = ws.openFiles.find((f) => f.path === activePath)

  const openSplit = () => {
    forge.setSplitFilePath(ws.activeFilePath)
    forge.setEditorSplit(true)
    forge.setFocusPane('primary')
  }

  const closeSplit = () => {
    forge.setEditorSplit(false)
    forge.setFocusPane('primary')
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
      <div className="forge-tab-bar flex shrink-0 items-stretch border-b border-line bg-sidebar/60">
        <div className="flex min-w-0 flex-1 overflow-x-auto">
          {ws.openFiles.length === 0 ? (
            <span className="px-3 py-2 text-[11px] text-fg-muted">
              {t('ide.editor.empty')}
            </span>
          ) : (
            ws.openFiles.map((f) => {
              const isActive = f.path === activePath
              return (
                <button
                  key={f.path}
                  type="button"
                  onClick={() => {
                    if (forge.editorSplit && forge.focusPane === 'secondary') {
                      forge.setSplitFilePath(f.path)
                    } else {
                      forge.setFocusPane('primary')
                      ws.setActiveFile(f.path)
                    }
                  }}
                  className={`group flex max-w-[200px] shrink-0 items-center gap-1.5 border-r border-line-subtle/60 px-3 py-1.5 text-[11px] ${lunaForgeTabClass(isActive)}`}
                >
                  <span className="truncate">
                    {basename(f.path)}
                    {f.dirty ? (
                      <span
                        className="ml-0.5 text-accent"
                        aria-label={t('forge.editor.unsaved')}
                      >
                        ●
                      </span>
                    ) : null}
                  </span>
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation()
                      void ws.closeTab(f.path)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation()
                        void ws.closeTab(f.path)
                      }
                    }}
                    className="rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
                    aria-label={t('ide.editor.closeTabAria')}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="stroke-current"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </span>
                </button>
              )
            })
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 border-l border-line-subtle px-2">
          {forge.editorSplit ? (
            <>
              <span className="hidden text-[9px] text-fg-muted sm:inline">
                {forge.focusPane === 'secondary'
                  ? t('forge.editor.paneSecondary')
                  : t('forge.editor.panePrimary')}
              </span>
              <button
                type="button"
                title={t('forge.editor.unsplitHint')}
                onClick={closeSplit}
                className="luna-btn-ghost rounded px-2 py-1 text-[10px] text-accent"
              >
                {t('forge.editor.unsplit')}
              </button>
            </>
          ) : (
            <button
              type="button"
              title={t('forge.editor.splitHint')}
              onClick={openSplit}
              className="luna-btn-ghost rounded p-1 text-fg-muted hover:text-fg"
              aria-label={t('forge.editor.split')}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className="stroke-current"
                strokeWidth="2"
                aria-hidden
              >
                <rect x="3" y="3" width="18" height="18" rx="1" />
                <path d="M12 3v18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {active ? (
        <nav
          className="flex shrink-0 items-center gap-1 border-b border-line-subtle/50 bg-canvas px-3 py-1 text-[10px] text-fg-muted"
          aria-label={t('forge.editor.breadcrumb')}
        >
          {dirname(active.path)
            .replace(/\\/g, '/')
            .split('/')
            .filter(Boolean)
            .map((segment, i, arr) => (
              <span key={`${segment}-${i}`} className="flex items-center gap-1">
                {i > 0 ? <span className="text-fg-muted/50">›</span> : null}
                <span className={i === arr.length - 1 ? 'text-fg-dim' : ''}>
                  {segment}
                </span>
              </span>
            ))}
          <span className="text-fg-muted/50">›</span>
          <span className="font-medium text-fg">{basename(active.path)}</span>
        </nav>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
