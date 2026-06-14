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
      className="luna-fade-in luna-callout-warning mx-auto mb-2 flex max-w-3xl items-start gap-2 px-3 py-2 text-ui"
      role="status"
    >
      <span className="mt-0.5 shrink-0 text-accent" aria-hidden>
        *
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
            className="luna-btn-ghost mt-1.5 px-0 py-0 text-[11px] text-accent hover:underline"
            onClick={() => onClearConversationMemory()}
          >
            Limpar resumo desta conversa
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className="luna-modal-close shrink-0"
        aria-label="Ocultar aviso"
        onClick={() => {
          sessionStorage.setItem(dismissKey(conversationId), '1')
          setDismissed(true)
        }}
      >
        x
      </button>
    </div>
  )
}
