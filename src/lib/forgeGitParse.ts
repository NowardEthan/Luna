export type GitFileStatus = {
  path: string
  index: string
  worktree: string
  staged: boolean
  unstaged: boolean
  untracked: boolean
}

export type ParsedGitStatus = {
  branch: string | null
  upstream: string | null
  ahead: number
  behind: number
  files: GitFileStatus[]
}

export function parseGitPorcelain(output: string): ParsedGitStatus {
  const lines = output.split(/\r?\n/).filter(Boolean)
  let branch: string | null = null
  let upstream: string | null = null
  let ahead = 0
  let behind = 0
  const files: GitFileStatus[] = []

  for (const line of lines) {
    if (line.startsWith('##')) {
      const rest = line.slice(3).trim()
      const branchPart = rest.split('...')[0]?.trim()
      branch = branchPart || null
      const upstreamMatch = rest.match(/\.\.\.([^\s\[]+)/)
      upstream = upstreamMatch?.[1] ?? null
      const aheadMatch = rest.match(/ahead (\d+)/)
      const behindMatch = rest.match(/behind (\d+)/)
      ahead = aheadMatch ? Number(aheadMatch[1]) : 0
      behind = behindMatch ? Number(behindMatch[1]) : 0
      continue
    }
    if (line.startsWith('??')) {
      const path = line.slice(3).trim()
      if (path) {
        files.push({
          path,
          index: '?',
          worktree: '?',
          staged: false,
          unstaged: false,
          untracked: true,
        })
      }
      continue
    }
    if (line.length < 4) continue
    const index = line[0] ?? ' '
    const worktree = line[1] ?? ' '
    const path = line.slice(3).trim()
    if (!path) continue
    files.push({
      path,
      index,
      worktree,
      staged: index !== ' ' && index !== '?',
      unstaged: worktree !== ' ' && worktree !== '?',
      untracked: false,
    })
  }

  return { branch, upstream, ahead, behind, files }
}

export function gitStatusLabel(file: GitFileStatus): string {
  if (file.untracked) return 'U'
  if (file.staged && file.unstaged) return 'M'
  if (file.staged) return file.index
  if (file.unstaged) return file.worktree
  return ' '
}
