import { compileIdeContextBlock } from '../../lib/ideContextCompiler'
import { compileForgeSessionMeta } from '../../lib/forgeSessionMeta'
import { ideContextLimits } from '../../lib/ideContextConfig'
import { getIdeTurnHost } from '../../lib/ideTurnHost'
import type { IdeAttachedContext } from '../../lib/ideMentions'
import { resolveMentionPath } from '../../lib/ideMentions'
import { humanizeLlmError } from '../../lib/llmErrorMessages'
import { completeLlmChat } from '../../lib/togetherClient'
import type { LlmSelection } from '../../lib/togetherClient'
import { resolveFileContent } from '../../lib/workspaceFileContent'
import type { Conversation } from '../../types/chat'
import { patchAssistantMessage } from './lib/messagePatch'

const LIGHT_REVIEW_BASE =
  'És a Luna no Luna Forge (IDE Orbit). O utilizador anexou ficheiro(s) com @ — o conteúdo já está no contexto abaixo. ' +
  'Analisa o código e responde em português (Portugal), de forma directa. ' +
  'PROIBIDO: pedir caminhos ao utilizador, sugerir scripts Python para abrir ficheiros, ou inventar paths. ' +
  'Se o ficheiro não estiver no contexto, diz que não foi possível ler o ficheiro no workspace aberto.'

function lightReviewSystemPrompt(): string {
  const meta = compileForgeSessionMeta()
  return meta ? `${LIGHT_REVIEW_BASE}\n\n${meta}` : LIGHT_REVIEW_BASE
}

async function buildFileContextBlock(
  mentions: IdeAttachedContext[],
  workspaceRoot: string | null,
): Promise<{ block: string; loaded: number }> {
  const limits = ideContextLimits()
  const parts: string[] = []
  let loaded = 0

  for (const m of mentions) {
    if (m.kind !== 'file' && m.kind !== 'folder') continue
    const abs = resolveMentionPath(m.ref, workspaceRoot)
    if (!abs) {
      parts.push(`**${m.label}** — não foi possível resolver o caminho (workspace aberto?)`)
      continue
    }
    const r = await resolveFileContent(abs, limits.mentionFileMaxChars)
    if (!r.ok || r.source === 'missing' || !r.content.trim()) {
      parts.push(`**${m.label}** — ficheiro não encontrado em \`${abs}\``)
      continue
    }
    loaded++
    parts.push(
      `**${m.label}** (\`${abs}\`, fonte: ${r.source})\n\`\`\`text\n${r.content}\n\`\`\``,
    )
  }

  return { block: parts.join('\n\n'), loaded }
}

export type RunIdeLightReviewInput = {
  convId: string
  assistantMsgId: string
  userText: string
  mentions: IdeAttachedContext[]
  llmSelection: LlmSelection | undefined
  updateConversation: (
    conversationId: string,
    updater: (c: Conversation) => Conversation | null | undefined,
  ) => void
}

export async function runIdeLightReview(
  input: RunIdeLightReviewInput,
): Promise<void> {
  const {
    convId,
    assistantMsgId,
    userText,
    mentions,
    llmSelection,
    updateConversation,
  } = input

  const host = getIdeTurnHost()
  const snapshot = host?.getSnapshot()
  const workspaceRoot = snapshot?.workspaceRoot ?? null

  patchAssistantMessage(convId, assistantMsgId, updateConversation, (m) => ({
    ...m,
    text: '',
    streamingActive: true,
    turnStatusHint: 'A ler o ficheiro…',
  }))

  const { block: fileBlock, loaded } = await buildFileContextBlock(
    mentions,
    workspaceRoot,
  )

  const workspaceBlock = snapshot
    ? await compileIdeContextBlock({
        snapshot,
        mentions,
        userQuery: userText,
        ragEnabled: false,
        compact: true,
      })
    : ''

  if (!workspaceRoot) {
    patchAssistantMessage(convId, assistantMsgId, updateConversation, (m) => ({
      ...m,
      text:
        'Abre uma pasta no explorador do Forge (Ficheiro → Abrir pasta) para eu conseguir ler @ficheiros do projecto.',
      streamingActive: undefined,
      turnStatusHint: undefined,
    }))
    return
  }

  if (loaded === 0) {
    patchAssistantMessage(convId, assistantMsgId, updateConversation, (m) => ({
      ...m,
      text:
        `Não encontrei o ficheiro mencionado no workspace \`${workspaceRoot}\`. ` +
        'Confirma o nome ou abre o ficheiro no explorador.',
      streamingActive: undefined,
      turnStatusHint: undefined,
    }))
    return
  }

  patchAssistantMessage(convId, assistantMsgId, updateConversation, (m) => ({
    ...m,
    turnStatusHint: 'A analisar o ficheiro…',
  }))

  const systemContent = [
    lightReviewSystemPrompt(),
    fileBlock,
    workspaceBlock.trim() ? `---\n\n${workspaceBlock}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  const res = await completeLlmChat(
    [
      { role: 'system', content: systemContent },
      { role: 'user', content: userText },
    ],
    {
      maxCompletionTokens: 1400,
      temperature: 0.35,
      reasoningEnabled: false,
      llmSelection,
    },
  )

  if (!res.ok) {
    patchAssistantMessage(convId, assistantMsgId, updateConversation, (m) => ({
      ...m,
      text: humanizeLlmError(res.error),
      streamingActive: undefined,
      turnStatusHint: undefined,
      llmProvider: llmSelection?.provider ?? m.llmProvider,
    }))
    return
  }

  patchAssistantMessage(convId, assistantMsgId, updateConversation, (m) => ({
    ...m,
    text: res.text.trim() || 'Sem análise disponível.',
    streamingActive: undefined,
    turnStatusHint: undefined,
    llmProvider: res.provider ?? llmSelection?.provider ?? m.llmProvider,
  }))
}
