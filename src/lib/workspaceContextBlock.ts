import type { OpenFileTab, PatchProposal } from '../context/LunaWorkspaceContext'

export function formatWorkspaceContextBlock(params: {
  workspaceRoot: string | null
  activeFilePath: string | null
  openFiles: OpenFileTab[]
  pendingPatches: PatchProposal[]
}): string {
  const lines: string[] = []
  lines.push(
    '**Sessão IDE (trabalho em código)** — a interface está em modo desenvolvimento; trata este turno como pair programming no projecto, não como conversa genérica.',
  )
  if (params.workspaceRoot) {
    lines.push(`- Raiz do projecto: \`${params.workspaceRoot}\``)
  } else {
    lines.push(
      '- Raiz: **ainda não aberta** — pede à pessoa para usar «Abrir pasta» no explorador antes de editar ficheiros.',
    )
  }
  if (params.activeFilePath) {
    lines.push(`- Ficheiro activo no editor: \`${params.activeFilePath}\``)
  } else if (params.workspaceRoot) {
    lines.push('- Ficheiro activo: nenhum — pergunta o que abrir ou usa grep/glob para localizar.')
  }
  const others = params.openFiles
    .filter((f) => f.path !== params.activeFilePath)
    .slice(0, 8)
  if (others.length) {
    lines.push(
      `- Outros tabs abertos: ${others.map((f) => `\`${f.path}\``).join(', ')}`,
    )
  }
  if (params.pendingPatches.length) {
    lines.push(
      `- Alterações à espera de aprovação da pessoa: ${params.pendingPatches.length} proposta(s) — lembra que só contam depois de aceites.`,
    )
  }
  return lines.join('\n')
}
