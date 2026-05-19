import {
  buildVerticalRecallBlock,
  mergeVerticalRecallBlocks,
  MERGED_VERTICAL_RECALL_MAX_CHARS,
} from '../../../lib/conversationArchiveSearch'
import {
  isChatMemoryAvailable,
  retrieveChatMemorySemantic,
  syncChatMemoryFromConversations,
} from '../../../lib/chatMemoryClient'
import { splitDataUrl, visionDescribeImages } from '../../../lib/togetherClient'
import type { RegisteredTool } from '../../registry/types'
import { finishTool } from '../toolResult'

const searchPastSchema = {
  type: 'function',
  function: {
    name: 'search_past_conversations',
    description:
      'Pesquisa em conversas anteriores desta pessoa neste app (memória semântica + palavras-chave). Use quando perguntarem o que falaram antes ou em outro chat.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'O que procurar no histórico de chats.',
        },
      },
      required: ['query'],
    },
  },
}

const describeImagesSchema = {
  type: 'function',
  function: {
    name: 'describe_images',
    description:
      'Analisa as imagens anexadas nesta mensagem (Lunar Vision). Use quando precisar de ver o conteúdo visual antes de responder.',
    parameters: {
      type: 'object',
      properties: {
        focus: {
          type: 'string',
          description:
            'Opcional: o que procurar ou descrever com prioridade nas imagens.',
        },
      },
    },
  },
}

export const conversationTools: RegisteredTool[] = [
  {
    name: 'search_past_conversations',
    family: 'conversation',
    schema: searchPastSchema,
    uiLabel: 'Chats anteriores',
    uiMeta: { label: 'Chats', badgeClass: 'bg-indigo-500/20 text-indigo-200' },
    handler: async ({ args, ctx }) => {
      const query = String(args.query ?? '').trim()
      if (!ctx.userMemory.conversationSearchEnabled) {
        return finishTool(
          'search_past_conversations',
          false,
          JSON.stringify({
            ok: false,
            error: 'Pesquisa em outros chats está desligada.',
          }),
          args,
          null,
        )
      }
      if (query.length < 2) {
        return finishTool(
          'search_past_conversations',
          false,
          JSON.stringify({ ok: false, error: 'query muito curta.' }),
          args,
          null,
        )
      }
      let semantic = ''
      if (isChatMemoryAvailable()) {
        await syncChatMemoryFromConversations(ctx.conversations)
        const sem = await retrieveChatMemorySemantic(query)
        if (sem.ok && sem.text.trim()) semantic = sem.text
      }
      const keyword = buildVerticalRecallBlock(query, ctx.conversations)
      const merged = mergeVerticalRecallBlocks(
        semantic,
        keyword,
        MERGED_VERTICAL_RECALL_MAX_CHARS,
      )
      if (!merged.trim()) {
        return finishTool(
          'search_past_conversations',
          false,
          JSON.stringify({
            ok: false,
            error: 'Nada encontrado em outros chats.',
          }),
          args,
          null,
        )
      }
      return finishTool(
        'search_past_conversations',
        true,
        JSON.stringify({ ok: true, context: merged }),
        args,
        { ok: true },
      )
    },
  },
  {
    name: 'describe_images',
    family: 'conversation',
    schema: describeImagesSchema,
    uiLabel: 'Visão',
    uiMeta: { label: 'Visão', badgeClass: 'bg-fuchsia-500/20 text-fuchsia-200' },
    handler: async ({ args, ctx, effects }) => {
      const cached = ctx.userMsg.visionDescription?.trim()
      if (cached) {
        effects.visionDescription = cached
        const n = ctx.imageAttachments.length
        return finishTool(
          'describe_images',
          true,
          JSON.stringify({ ok: true, description: cached, cached: true }),
          { ...args, _imageCount: n },
          { ok: true },
        )
      }
      const parsed = ctx.imageAttachments
        .map((im) => splitDataUrl(im.dataUrl))
        .filter((x): x is { mime: string; dataBase64: string } => x != null)
      if (!parsed.length) {
        return finishTool(
          'describe_images',
          false,
          JSON.stringify({
            ok: false,
            error: 'Não há imagens anexadas neste turno.',
          }),
          { ...args, _imageCount: 0 },
          null,
        )
      }
      const focus = typeof args.focus === 'string' ? args.focus.trim() : ''
      const caption = [ctx.userCaption, focus].filter(Boolean).join('\n')
      const vr = await visionDescribeImages({
        images: parsed,
        userCaption: caption,
      })
      if (!vr.ok) {
        return finishTool(
          'describe_images',
          false,
          JSON.stringify({ ok: false, error: vr.error }),
          { ...args, _imageCount: parsed.length },
          null,
        )
      }
      effects.visionDescription = vr.text
      return finishTool(
        'describe_images',
        true,
        JSON.stringify({ ok: true, description: vr.text }),
        { ...args, _imageCount: parsed.length },
        { ok: true },
      )
    },
  },
]
