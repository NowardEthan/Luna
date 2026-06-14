import { completeLlmChat } from '../../lib/togetherClient'
import type { LlmSelection } from '../../lib/togetherClient'
import { humanizeLlmError } from '../../lib/llmErrorMessages'

const INLINE_EDIT_SYSTEM =
  'És um editor de código no Luna Forge. O utilizador seleccionou um excerto (ou o ficheiro inteiro) e pediu uma alteração. ' +
  'Responde APENAS com o conteúdo completo do ficheiro após a edição — sem markdown, sem explicações, sem cercas ```.'

function stripCodeFences(text: string): string {
  const trimmed = text.trim()
  const match = trimmed.match(/^```[\w-]*\n([\s\S]*?)```\s*$/m)
  if (match?.[1] != null) return match[1].trimEnd()
  return trimmed
}

export type RunForgeInlineEditInput = {
  path: string
  fileContent: string
  selectedText: string
  instruction: string
  llmSelection: LlmSelection | undefined
  signal?: AbortSignal
}

export type RunForgeInlineEditResult =
  | { ok: true; newContent: string }
  | { ok: false; error: string }

export async function runForgeInlineEdit(
  input: RunForgeInlineEditInput,
): Promise<RunForgeInlineEditResult> {
  const { path, fileContent, selectedText, instruction, llmSelection, signal } =
    input

  const selectionBlock = selectedText.trim()
    ? `Excerto seleccionado:\n\`\`\`\n${selectedText}\n\`\`\``
    : 'Nenhum excerto seleccionado — aplica a instrução ao ficheiro completo.'

  const userContent = [
    `Ficheiro: ${path}`,
    `Instrução: ${instruction.trim()}`,
    selectionBlock,
    `Conteúdo actual do ficheiro:\n\`\`\`\n${fileContent}\n\`\`\``,
  ].join('\n\n')

  const res = await completeLlmChat(
    [
      { role: 'system', content: INLINE_EDIT_SYSTEM },
      { role: 'user', content: userContent },
    ],
    {
      maxCompletionTokens: 8000,
      temperature: 0.2,
      reasoningEnabled: false,
      llmSelection,
      signal,
    },
  )

  if (!res.ok) {
    return { ok: false, error: humanizeLlmError(res.error) }
  }

  const newContent = stripCodeFences(res.text)
  if (!newContent.trim()) {
    return { ok: false, error: 'O modelo devolveu uma resposta vazia.' }
  }

  return { ok: true, newContent }
}
