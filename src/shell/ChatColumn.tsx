import { memo, type ReactNode } from 'react'

type Props = {
  header: ReactNode
  compactionBanner?: ReactNode
  messages: ReactNode
  footer: ReactNode
}

export const ChatColumn = memo(function ChatColumn({
  header,
  compactionBanner,
  messages,
  footer,
}: Props) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-canvas">
      <div className="shrink-0">{header}</div>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {compactionBanner && (
          <div className="shrink-0 px-3 pt-2">{compactionBanner}</div>
        )}
        {messages}
      </div>
      <div className="relative shrink-0">{footer}</div>
    </div>
  )
})
