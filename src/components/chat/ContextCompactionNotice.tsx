import { useEffect, useState } from 'react'

const dismissKey = (convId: string) => `luna-compaction-dismiss:${convId}`

type Props = {
  conversationId: string
  summarizedThroughMessageId?: string
  onClearConversationMemory?: () => void
}

export function ContextCompactionNotice({
  conversationId,
  summarizedThroughMessageId,
  onClearConversationMemory,
}: Props) {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(dismissKey(conversationId)) === '1',
  )

  useEffect(() => {
    setDismissed(sessionStorage.getItem(dismissKey(conversationId)) === '1')
  }, [conversationId])

  if (!summarizedThroughMessageId || dismissed) return null

  return (
    <div
      className="luna-fade-in mx-auto mb-2 flex max-w-3xl items-start gap-2 rounded-lg border border-violet-500/25 bg-violet-500/10 px-3 py-2 text-ui text-fg-dim"
      role="status"
    >
      <span className="mt-0.5 shrink-0 text-violet-300/90" aria-hidden>
        ◈
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-fg">
          Contexto desta conversa foi resumido
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-fg-muted">
          Mensagens mais antigas foram condensadas num resumo para caber no limite
          do modelo. As mensagens recentes continuam completas.
        </p>
        {onClearConversationMemory ? (
          <button
            type="button"
            className="mt-1.5 text-[11px] text-accent hover:underline"
            onClick={() => onClearConversationMemory()}
          >
            Limpar resumo desta conversa
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className="shrink-0 rounded p-0.5 text-fg-muted hover:bg-white/[0.06] hover:text-fg"
        aria-label="Ocultar aviso"
        onClick={() => {
          sessionStorage.setItem(dismissKey(conversationId), '1')
          setDismissed(true)
        }}
      >
        ×
      </button>
    </div>
  )
}
