/** Vistas da sidebar primária do Luna Forge (estilo Cursor / VS Code). */
export type ForgeSidebarView =
  | 'explorer'
  | 'search'
  | 'git'
  | 'outline'
  | 'conversations'
  | 'memories'

/** Abas do painel inferior. */
export type ForgeBottomTab = 'problems' | 'output' | 'terminal' | 'debug'

const SIDEBAR_KEY = 'luna-forge-sidebar-open'
const AI_KEY = 'luna-forge-ai-open'
const BOTTOM_KEY = 'luna-forge-bottom-open'
const BOTTOM_TAB_KEY = 'luna-forge-bottom-tab'
const VIEW_KEY = 'luna-forge-sidebar-view'
const EDITOR_SPLIT_KEY = 'luna-forge-editor-split'
const EDITOR_MINIMAP_KEY = 'luna-forge-editor-minimap'

function readBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key)
    if (v === '0') return false
    if (v === '1') return true
  } catch {
    /* ignore */
  }
  return fallback
}

function writeBool(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function readForgeSidebarOpen(): boolean {
  return readBool(SIDEBAR_KEY, true)
}

export function writeForgeSidebarOpen(open: boolean): void {
  writeBool(SIDEBAR_KEY, open)
}

export function readForgeAiPanelOpen(): boolean {
  return readBool(AI_KEY, true)
}

export function writeForgeAiPanelOpen(open: boolean): void {
  writeBool(AI_KEY, open)
}

export function readForgeBottomOpen(): boolean {
  return readBool(BOTTOM_KEY, false)
}

export function writeForgeBottomOpen(open: boolean): void {
  writeBool(BOTTOM_KEY, open)
}

export function readForgeBottomTab(): ForgeBottomTab {
  try {
    const v = localStorage.getItem(BOTTOM_TAB_KEY)
    if (v === 'problems' || v === 'output' || v === 'terminal' || v === 'debug') {
      return v
    }
  } catch {
    /* ignore */
  }
  return 'problems'
}

export function writeForgeBottomTab(tab: ForgeBottomTab): void {
  try {
    localStorage.setItem(BOTTOM_TAB_KEY, tab)
  } catch {
    /* ignore */
  }
}

export function readForgeSidebarView(): ForgeSidebarView {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    if (
      v === 'explorer' ||
      v === 'search' ||
      v === 'git' ||
      v === 'outline' ||
      v === 'conversations' ||
      v === 'memories'
    ) {
      return v
    }
  } catch {
    /* ignore */
  }
  return 'conversations'
}

export function writeForgeSidebarView(view: ForgeSidebarView): void {
  try {
    localStorage.setItem(VIEW_KEY, view)
  } catch {
    /* ignore */
  }
}

export function readForgeEditorSplit(): boolean {
  return readBool(EDITOR_SPLIT_KEY, false)
}

export function writeForgeEditorSplit(open: boolean): void {
  writeBool(EDITOR_SPLIT_KEY, open)
}

export function readForgeEditorMinimap(): boolean {
  return readBool(EDITOR_MINIMAP_KEY, true)
}

export function writeForgeEditorMinimap(open: boolean): void {
  writeBool(EDITOR_MINIMAP_KEY, open)
}
