import type { OpenFileTab, PatchProposal, TerminalLine } from '../context/LunaWorkspaceContext'

export type WorkspaceSnapshot = {
  workspaceRoot: string | null
  workspaceFolders?: string[]
  activeFilePath: string | null
  openFiles: OpenFileTab[]
  pendingPatches: PatchProposal[]
  terminalLines: TerminalLine[]
  terminalBusy: boolean
  gitDirtyPaths: string[]
  lastTerminalCommand?: { command: string; exitCode?: number }
}

export type IdeTurnHost = {
  getSnapshot: () => WorkspaceSnapshot
  proposePatch: (
    proposal: Omit<PatchProposal, 'id' | 'createdAt'>,
  ) => string
  acceptPatch: (id: string) => Promise<boolean>
  appendTerminalOutput: (lines: TerminalLine[]) => void
  setTerminalBusy: (busy: boolean) => void
  markGitDirty: (paths: string[]) => void
  proposeGitCommit: (message: string) => string
  readFileFromWorkspace: (
    path: string,
    maxChars?: number,
  ) => Promise<{
    ok: boolean
    content?: string
    source?: 'editor' | 'disk' | 'missing'
  }>
  recordTerminalCommand?: (command: string, exitCode?: number) => void
}

let activeHost: IdeTurnHost | null = null

export function setIdeTurnHost(host: IdeTurnHost | null): void {
  activeHost = host
}

export function getIdeTurnHost(): IdeTurnHost | null {
  return activeHost
}
